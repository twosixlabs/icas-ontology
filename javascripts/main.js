(function () {

function pointOnRay(x, y, rad_angle, distance) {
  var res = {
    x: x,
    y: y
  };

  res.x += Math.cos(rad_angle) * distance;
  res.y += Math.sin(rad_angle) * distance;

  return res;
}

var colors = {
  "object": "black",
  "datatype": "green"
};

var foci = {
  object: {x: 50, y: 300},
  datatype: {x: 500, y: 300}
};

var node, link, linklabel;

function setLinkLabels(sel) {
  sel.attr('class','linklabel')
  .text(function (d) { return d.name; })
  .attr('text-anchor', 'middle')
  .attr('x', function(d) {
      return d.midpoint.x;
  })
  .attr('y', function(d) {
      return d.midpoint.y;
  })
  .attr('transform', function (d) {
    var params, angle;
    if (d.source !== d.target) {
      angle = (180/Math.PI) * Math.atan(( d.source.y - d.target.y ) / ( d.source.x - d.target.x ));
      params ='rotate('+  angle  + ' ' + d.midpoint.x + ' ' + d.midpoint.y + ')';
      params += 'translate(0, 15)';
    }
    else {
      params = "translate(0, -15)";
    }
    return params;
  });
}

var docExploreCtrl = function($scope, SockJSService, $timeout, $q, $state, $stateParams) {

  $scope.datafile = null;
  $scope.startingNodeSelected = null;
  $scope.endingNodeSelected = null;

  $scope.svgConfig = { 
    width: 960,
    height: 600,
    nodeRadius: 10,
    nodeSubclassRadius: 15,
    propertyRadius: 5
  };

  $scope.filter = {
    auto_interconnect: false,
    owlthing: true
  };
  $scope.falseVal = false;
  $scope.trueVal = true;
  $scope.$watchCollection('filter', function() {
    $scope.render();
  });

  $scope.raw_data = null;
  $scope.nodeIdToIdx = null;
  $scope.nodes = [];
  $scope.links = [];
  $scope.nodeLinkCount = {};

  $scope.drag = d3.behavior.drag()
  .on("drag", function() {
    var d;
    d = d3.select(this).datum();
    d.x = d3.event.x;
    d.y = d3.event.y;

    $scope.move_objects();
  })
  .on('dragstart', function() {
    d3.event.sourceEvent.stopPropagation();
  });

  $scope.getById = function(id) {
    return $scope.raw_data.nodes[$scope.nodeIdToIdx[id]];
  };

  $scope.expandLinks = function(link) {
    // Expand the visualization to include 
    // 'link'.
    var n = $scope.getById(link.id);

    if ($scope.nodes.indexOf(n) === -1) {
      $scope.nodes.push(n);
    }

    link.expanded = true;
    $scope.links.push(link);
  };

  $scope.replaceNode = function(oldnode, newnode) {

    $scope.nodes = $scope.nodes.filter(function(n) {
      return n === oldnode ? false : true;
    });

    $scope.nodes.push(newnode);

    $scope.links = $scope.links.map(function(l) {
        if (l.target == oldnode) {
            l.target = newnode;
        }
        else if (l.source == oldnode) {
            l.source = newnode;
        }
        return l;
    });

  }

  $scope.retractLink = function(link) {
    var thisnode = $scope.getById(link.id);

    $scope.nodes = $scope.nodes.filter(function(n) {
      return n === thisnode ? false : true;
    });

    $scope.links = $scope.links.filter(function(e) {
      return e === link ? false : true;
    });

    link.expanded = link.visible = false;
  };

  $scope.fetchRemoteData = function() {
    var deferred = $q.defer();

    var req = {
      domain: "ontology",
      request: "graph_data",
      payload: {}
    };

    SockJSService.request(req).then(
        function(graph_data) {
            deferred.resolve(graph_data)
        },
        function(error) {
            console.log("Error: " + error);
            deferred.reject(error);
         }
    );
    return deferred.promise;
  };

  $scope.newData = function(filelist) {
    var reader = new FileReader();

    reader.onload = function(evt) {
      $scope.$apply(function() {
        $scope.parseData(JSON.parse(evt.target.result));
      });
    };
    $scope.datafile = filelist[0];
    reader.readAsBinaryString(filelist[0]);
  };

  $scope.parseData = function(rawData) {

    var graphMap = {};
    $scope.raw_data = rawData;
    $scope.startingPoints = [];
    $scope.endingPoints = [];

    $scope.nodeIdToIdx = {};
    $scope.raw_data.nodes.forEach(function(n, i){
      $scope.nodeIdToIdx[n.id] = i;
      if (n.type === 'object' && $scope.raw_data.adjacency[i].length > 0
            && !_.contains(n.inheritance, 'event')) {
        $scope.startingPoints.push(n);
      }
    });

    // raw_data.adjacency is a list of lists. The indices in the outer
    // list map to the index of the node in raw_data.adjacency. Thus
    // raw_data.adjacency[0] is the adjacency list for raw_data.nodes[0].
    //
    // The adjacency list is a list of objects, each object representing
    // the edge and connected node. However, these objects don't directly
    // represent the source and target node, so this next loop will
    // create links for them.
    //
    $scope.raw_data.adjacency.forEach(function(edgelist, s_idx) {
        edgelist.forEach(function(e) {
          // The source is the node at the same index as this one.
          e.source = $scope.raw_data.nodes[s_idx];
          // The target node id is in the id field of the edge object. Dereference it.
          e.target = $scope.getById(e.id);
          e.key = String(e.source.id + "|" + e.name + "|" + e.id);
          // Note whether or not this link is visible
          e.expanded = false;

          if (e.type === 'objectproperty') {
            // We only care about object properties for pathfinding. Searching
            // via dataproperties is dumb.
            // Also, we're going to save it both directions, because SPARQL can
            // do that just fine, and so we should be able to too (and because
            // the DijkstraGraph is directed o_O
            if (! _.has(graphMap, e.source.id)) {
              graphMap[e.source.id] = {};
            }
            graphMap[e.source.id][e.target.id] = 1;

            if (!_.has(graphMap, e.target.id)) {
              graphMap[e.target.id] = {};
            }
            graphMap[e.target.id][e.source.id] = 1;
          }
        });
    });

    $scope.graph = new DijkstraGraph(graphMap);

    //$scope.render()
  };

  $scope.linkArc = function(d) {
    /* Draw the link */
    var source = null, 
    target = null,
    large = null,
    dx = 0,
    dy = 0,
    rot = 0,
    dr = 0;
    var angle = Math.atan((d.source.y - d.target.y) / (d.source.x - d.target.x));

    if (d.source === d.target) {
      source = d.source;
      target = d.target;
      source = pointOnRay(d.source.x, d.source.y, (3 *Math.PI/2) - Math.PI/8, 30);
      target = pointOnRay(d.target.x, d.target.y, (3 *Math.PI/2) + Math.PI/8, 30);

    } else if (d.source.x > d.target.x) {
      source = pointOnRay(d.source.x, d.source.y, angle + (Math.PI), 30);
      target = pointOnRay(d.target.x, d.target.y, angle, 30);

    } else {
      source = pointOnRay(d.source.x, d.source.y, angle, 30);
      target = pointOnRay(d.target.x, d.target.y, angle + (Math.PI), 30);
    }

    var count = $scope.linkCount[$scope.undirectedLinkId(d)];
    if (count === 1) {
      return "M" + source.x + "," + source.y + " L" + target.x + "," + target.y;
    }
    if (d.target.index === d.source.index) {
      dx = 60;
      dy = 20;
      rot = 90;
      large = "1 1";
    } else {
      dx = target.x - source.x;
      dy = target.y - source.y;
      dr = Math.sqrt(dx * dx + dy * dy);
      large = "0 1";
      rot = 0;

      dx = dy = dr;
    }


    return "M" + source.x + "," + source.y + "A" + dx + "," + dy + " " + rot + ","+large+" " + (target.x + 1) + "," + (target.y + 1);
  };

  $scope.move_objects = function() {
    /* Viz: Move things when you drag */

    node.attr('transform', function (d) {
      return 'translate(' + d.x + ',' + d.y + ')';
    });

    link.select('path')
    .attr('d', $scope.linkArc)
    .each(function(d) {
      d.midpoint = this.getPointAtLength(this.getTotalLength() / 2);
    });

    link.select('text').call(setLinkLabels);
  };

  $scope.$watch('startingNodeSelected', function(newv){
    if (newv !== null) {
        $scope.endingPoints = _.filter($scope.startingPoints, function(n) {
            return n != $scope.startingNodeSelected
        });
      $timeout($scope.reset, 0);
    }
  });
  $scope.$watch('endingNodeSelected', function(newv){
    if (newv !== null) {
      $timeout($scope.reset, 0);
    }
  });

  $scope.reset = function() {
    /* Reset the visualization to show the original node, 
     * and only that node 
     * */
    var path;

    $scope.nodes = [];
    $scope.links = [];

    if ($scope.endingNodeSelected) {
      path = $scope.graph.findShortestPath(
        $scope.startingNodeSelected.id,
        $scope.endingNodeSelected.id);

        if (! path) {
          $.growl(
            {
            title: "Error: ",
            message: "No path available.",
            icon:'glyphicon glyphicon-warning-sign'
          },
          { type: "danger" }
          );

          $scope.endingNodeSelected = null;
          return;
        }
    }
    else {
      $scope.nodes.push(
        $scope.getById($scope.startingNodeSelected.id)
      );
    }

    if (path) {
      var n1, n2, i, links;

      // find links between us and the other nodes in the path and turn 
      // those links on
      // Theory lesson: We don't need two nested loops. The nested loops 
      // are looking for other connnections between the nodes in the path.
      // If the path returned is A -> B -> C, and there exists a link from
      // A -> C, then by definition, the shortest path algorithm is incorrect
      // because the shortest path is actually A->C.
      var setVisible = function(e, target) {
        if (e.target.id === target.name) {
          e.expanded = e.visible = true;
          return true;
        }
        return false;
      };

      for (i = 0; i < path.length-1; i++) {
        n1 = {
          name: path[i],
          idx: $scope.nodeIdToIdx[path[i]],
          data: $scope.getById(path[i])
        };

        n2 = {
          name: path[i+1],
          idx: $scope.nodeIdToIdx[path[i+1]],
          data: $scope.getById(path[i+1])
        };

        links = _.filter($scope.raw_data.adjacency[n1.idx], function(e) { return setVisible(e, n2); });
        links.push.apply(links, _.filter($scope.raw_data.adjacency[n2.idx], function(e) { return setVisible(e, n1); }));

        if (links.length > 0) {
          $scope.links.push.apply($scope.links, links);
        }

        $scope.nodes.push(n1.data);

      }

      $scope.nodes.push(n2.data);

    }

    $scope.render();
  };

  // Setup
  $scope.svg = d3.select("svg#renderer").select('g');

  $scope.svg.append("defs").selectAll("marker")
  .data(["objectproperty", "subclass", "dataproperty"])
  .enter().append("marker")
  .attr("id", function(d) { return d; })
  .attr("viewBox", "0 -5 10 10")
  .attr("refX", 6)
  .attr("refY", 0.1)
  .attr("markerWidth", 8)
  .attr("markerHeight", 8)
  .attr("orient", "auto")
  .append("path")
  .attr("d", "M0,-5L10,0L0,5");

  $scope.include_link = function(e) {
    /* Apply a number of filters over the links */
    if ((true || $scope.filter.subclass) && e.type === 'subclass') {
      return false;
    }
    if (!$scope.filter.auto_interconnect && !e.expanded) {
      e.visible = false;
      return false;
    }

    if ( $scope.filter.owlthing  && (e.definition_domain === 'owl#Thing' || e.definition_range === 'owl#Thing') ){
      return false;
    }

    e.visible = true;
    return true;
  };

  $scope.undirectedLinkId = function(l) {
    if (l.source.id < l.target.id) {
      return String(l.source.id + "|" + l.target.id);
    }
    return String(l.target.id + "|" + l.source.id);
  };

  $scope.apply_filters = function() {
    $scope.nodeLinkCount = {};
    var filtered_links = [];
    var filtered_nodes, k, idx, thisnode, id;
    var addLinkFn;

    // Filter the output set of links from $scope.links
    // Note that this isn't the full set of links. If a link
    // isn't in $scope.links, then it won't be drawn unless
    // added below
    filtered_links = $scope.links.filter(function(e) {

      if (!$scope.include_link(e)){ 
        return false;
      }

      // Just count number of links for later use
      if ( $scope.nodeLinkCount[e.target.id] ) { 
        $scope.nodeLinkCount[e.target.id] += 1 ;
      }
      else {
        $scope.nodeLinkCount[e.target.id] = 1;
      }

      if ( $scope.nodeLinkCount[e.source.id] ) { 
        $scope.nodeLinkCount[e.source.id] += 1 ;
      }
      else {
        $scope.nodeLinkCount[e.source.id] = 1;
      }

      return true;
    });

    // Start the node list with $scope.nodes
    filtered_nodes = [].concat($scope.nodes);

    /* When we added the links before, we kept track of 
     * their endpoints. Check through the set of nodes
     * for which there was at least one connection.
     * */
    addLinkFn = function(e) {
      if (!$scope.nodeLinkCount[e.id]) { return; } // It's not a visible node

      if (!$scope.include_link(e)) { return; } // We don't have it because our filters down allow it

      if (filtered_links.indexOf(e) !== -1) { return; } // It's already in our list

      filtered_links.push(e); // Okay find add it.
    };

    _.each($scope.nodeLinkCount, function(count, nodeid){
      if (count > 0) {
        idx = $scope.nodeIdToIdx[nodeid];
        thisnode = $scope.getById(nodeid);

        if (filtered_nodes.indexOf(thisnode) === -1) {
          filtered_nodes.push(thisnode);
        }

        // Now for the fun time.  There may be
        // some interconnecting links that aren't in $scope.links, so lets add them
        // if appropriate.
        $scope.raw_data.adjacency[idx].forEach(addLinkFn);
      }
    });

    $scope.linkCount = {};
    filtered_links.forEach(function(l) {
      id = $scope.undirectedLinkId(l);

      if (_.has($scope.linkCount, id)) {
        $scope.linkCount[id] += 1 ;
      }
      else {
        $scope.linkCount[id] = 1;
      }
    });

    return {nodes: filtered_nodes, links: filtered_links};
  };

  $scope.setup_nodes = function(nodes) {
    nodes.append('rect')
    .attr('width', function(d) {
      return String(d.id.length + "ex");
    })
    .attr('height', 18)
    .attr('fill', '#fff')
    .attr('x', 22)
    .attr('y', -10)

    nodes.each(function(d){
        var thisnode = d3.select(this);
        if (d.subclasses && d.subclasses.length > 0) {
            thisnode.append('circle')
            .attr('r', 13)
            .attr('stroke', 'green')
            .attr('stroke-width', 2)
            .attr('fill', 'none');
        }

        actions = [];

        subcls_actions = _.map(d.subclasses, function (subclass) {
            return {
                text: subclass,
                action: function(e) {
                    $scope.replaceNode($scope.getById(d.id), $scope.getById(subclass))
                    $scope.$apply(function() {
                        $scope.render();
                    })
                }
            }
        });

        if (_.size(subcls_actions)) {
            actions.push({
                text: "Replace with subclass",
                subMenu: subcls_actions
            });
        }

        if (_.size(actions)) {
            context.attach('#' + d.id.replace('#', '-'), actions);
        }

    });

    nodes.append('circle')
    .attr('r', 10)
    //.attr('cx', function(d) {return d.x})
    //.attr('cy', function(d) {return d.y})
    .style('fill', function(d) {return colors[d.type]; });

    nodes.append('text')
    .attr('class','nodelabel')
    .text(function (d) { return d.id; })
    .attr('text-anchor', 'left')
    .attr('x', function(node) {
        var conns = $scope.raw_data.adjacency[$scope.nodeIdToIdx[node.id]].filter(function(e, i) {
          if ( e.type === 'subclass' ) { return false; }
          if (e.expanded || e.visible ) { return false; }
          return true;
        });
        var i = conns.length;
        var level = Math.floor(Math.log(i+1) / Math.log(12)) + 1;
        return 20 + 10 * level;
    })
    .attr('y', 4);
  };

  $scope.radial_position = {
      x: function(d, i) {
         var angle, level, distance, count;
         level = Math.floor(Math.log(i+1) / Math.log(12)) + 1;
         distance = (10 + level * 11);
         // We can fit diameter / size things
         count = Math.floor((2 * Math.PI * distance) / 11);

         if (level === 1) {
             angle = Math.cos(i * (Math.PI/(count/2)));
         } else {
             angle = Math.cos(i * (Math.PI/(count/2)));
         }
         return angle * distance;
      },
      y: function (d, i) {
         var angle, level, distance;
         level = Math.floor(Math.log(i+1) / Math.log(12)) + 1;
         distance = (10 + level * 11);
         // We can fit diameter / size things
         count = Math.floor((2 * Math.PI * distance) / 11);

         if (level === 1) {
             angle = Math.sin(i * (Math.PI/(count/2)));
         } else {
             angle = Math.sin(i * (Math.PI/(count/2)));
         }
         return angle * distance;
      }
  }


  $scope.render_nodeprops = function(node) {
    var thisnode = d3.select(this);
    var conns = $scope.raw_data.adjacency[$scope.nodeIdToIdx[node.id]].filter(function(e, i) {
      if ( e.type === 'subclass' ) { return false; }
      if (e.expanded || e.visible ) { return false; }
      return true;
    });
    var nodeid = node.id.replace('#', '-');
    var nodeconns = thisnode.selectAll('.connections-' + nodeid)
    .data(conns, function(sub) {return sub.key; });

    nodeconns
    .attr('cx', $scope.radial_position.x)
    .attr('cy', $scope.radial_position.y)

    nodeconns.enter()
    .append('circle')
    .classed('connections-' + nodeid, true)
    //.classed('dataproperty', function(n) { n.type == 'dataproperty' ? true : false})
    //.classed('objectproperty', function(n) { n.type == 'objectproperty' ? true : false})
    .attr('cx', $scope.radial_position.x)
    .attr('cy', $scope.radial_position.y)
    .attr('r', 5)
    .attr('fill', function(e) {
      if (e.type === 'dataproperty'){ return 'green'; }
      if (e.type === 'objectproperty') {
        return e.source === e.target ? 'purple' : 'blue';
      }
      return 'black';
    })
    .attr('stroke', function(e) {
    if (e.definition_domain != null || e.definition_range) {
    return 'grey';
    }
    })
    .attr('stroke-width', function(e) {
    if (e.definition_domain != null || e.definition_range) {
    return '2';
    }
    })
    .on('mouseover', function(e) {
      var tt;
      d3.select(this).attr('r', 7);
      tt = d3.select('#tooltip')
      .style('left', function(d, i) { 
        var coord =  (d3.event.pageX - window.pageXOffset) + (Math.cos(i * (Math.PI/6)) *  30) ;
        return coord;
      })
      .style('top', function(d, i) {
        var coord = (d3.event.pageY -  window.pageYOffset) + (Math.sin(i * (Math.PI/6)) *  30);
        return coord;
      })
      .style('opacity', 0.95)
      .style('display', 'block');

      tt.select("#tt-heading")
      .html("<h5 class='panel-title'> " + e.name + "&rarr;<em> " + e.id + "</em> </h5>");

      var drawHTML = function() {
        var html = "";
        html += "<table cellspacing='0' class='table'>";
        var attrs = ['label', 'comment', 'definition_domain'];
        attrs.forEach(function(attr){
            if (e[attr] != null ) {
              html +=   "<tr>";
              html +=     "<td><strong>" + attr.charAt(0).toUpperCase() + attr.slice(1) + ":</strong></td>";
              html +=     "<td>" + e[attr] +  "</td>";
              html +=   "</tr>";
            }
        });
        html += "</table>";

        return html;
      };

      tt.select("#tt-body")
      .html(drawHTML());
    })
    .on('mouseout', function(e) {
      var tt;
      d3.select(this).attr('r', 5);
      tt = d3.select('#tooltip');
      tt .style('opacity', 0);
      tt .style('display', 'none');
    })
    .on('dblclick', function(e) {
      if (e.target === e.source) {
        d3.event.preventDefault();
        return;
      }

      $scope.$apply(function() {
        $scope.expandLinks(e);
        $scope.render();
      });
    });

    nodeconns.exit().remove();
  };

  $scope.render = function() {
    /* Redraw the entire image. First apply any filters, then update what's on the screen */
    var data, tree, force;

    console.log("Rendering!");

    // Get the actual data we'll draw.  THis is a subset of the available data based
    // on what apply_filters returns
    data = $scope.apply_filters();

    node = $scope.svg.selectAll("g.node").data(data.nodes, function(d) {
      return d.id;
    });

    link = $scope.svg.selectAll("g.link").data(data.links, function(d) {
      return d.key;
    });
    //linklabel = $scope.svg.selectAll(".linklabel").data(data.links, function(d) {
    //return d.key
    //})

    tree = d3.layout.tree()

    force = d3.layout.force()
    .nodes(data.nodes)
    .charge(-200)
    .gravity(0.01)
    .size([$scope.svgConfig.width, $scope.svgConfig.height])
    .on('tick', $scope.move_objects);

    force.start();
    //for (var i = 0; i < 200; i++ ) force.tick()
    //force.stop()

    // Update existing 

    linklabel = link.select('text');
    link.select('path')
    .attr('d', $scope.linkArc) 
    .each(function(d) {
      d.midpoint = this.getPointAtLength(this.getTotalLength() / 2);
    });

    node.attr('transform', function (d) {
      return 'translate(' + d.x + ',' + d.y + ')';
    });

    linklabel.call(setLinkLabels);

    // Add new things
    var newlinks = link.enter().append('g')
    .attr('class', function(d) { d.type; })
    .classed("link", true)
    .classed('manually-expanded', function(d) { return d.expanded; })
    .on('dblclick', function(e) {
      $scope.retractLink(e);
      $scope.render();
      d3.event.stopPropagation();
    });

    newlinks.append('path')
    .attr('d', $scope.linkArc)
    .attr('marker-end', function(d) { return 'url(#' + d.type + ')'; })
    .each(function(d) {
      d.midpoint = this.getPointAtLength(this.getTotalLength() / 2);
    });

    node.each($scope.render_nodeprops);

    var newnodes = node.enter().append('g')
    .attr('class', 'node')
    .attr('transform', function (d) {
      return 'translate(' + d.x + ',' + d.y + ')';
    })
    .attr('id', function(d) { return d.id.replace("#", "-"); })
    .call($scope.drag)
    .call($scope.setup_nodes)
    .each($scope.render_nodeprops);

    newlinks.append('text')
    .call(setLinkLabels);

    node.exit().each(function(d) {
        console.log("Exiting: ", d)
        context.destroy('#' + d.id);
    }).remove() ;

    link.exit().remove();
    //linklabel.exit().remove()
    //link.exit().remove()

  };

  $scope.fetchRemoteData().then(function(data){
    $timeout(function() {
      $scope.parseData(data);
    });
  });

};

var tapioApp = angular.module('tapioApp', []);

tapioApp.controller('exploreCtrl', docExploreCtrl);

}
).call(this);

