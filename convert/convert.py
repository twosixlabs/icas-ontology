
from networkx.readwrite import json_graph
import rdflib
import os
import tapio_common.mapper.ontology_helper


def _ontowalker():

    # the prefix namespace
    tapio_ns = rdflib.namespace.Namespace('http://www.invincea.com/ontologies/icas/1.0/')

    # 'base' is the search base
    base = os.path.join(__file__, 'ontology')

    # the base ontology
    tapio_tld = rdflib.Graph(identifier='tapio')
    tapio_tld.parse(os.path.join(base, 'tapio.ttl'),
                    format=rdflib.util.guess_format(os.path.join(base, 'tapio.ttl')))

    extension = '.ttl'

    for onto in tapio_common.mapper.ontology_helper.walk_imported_ontologies(
            tapio_tld, tapio_ns, search_base=base, extension=extension):
        yield onto


def main():

    graph = tapio_common.mapper.ontology_helper.ontology_as_multidigraph(
        ontology_walker=_ontowalker)

    print(json_graph.adjacency_data(graph))


if __name__ == "__main__":
    main()
