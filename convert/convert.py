
from networkx.readwrite import json_graph
import os
from tapio_common.mapper import ontology_helper


def main():

    graph = ontology_helper.ontology_as_multidigraph(
            ontology=ontology_helper.construct_ontology_graph(os.path.join(os.path.dirname(__file__), "..", 'ontology')))

    print(json_graph.adjacency_data(graph))


if __name__ == "__main__":
    main()
