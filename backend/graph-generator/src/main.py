# FILE: /graph-generator/graph-generator/src/main.py

import json
import matplotlib.pyplot as plt
from graph_utils import generate_line_graph, generate_bar_graph, save_graph_to_file

def load_data(file_path):
    with open(file_path, 'r') as file:
        return json.load(file)

def main():
    # Load sample data
    data = load_data('src/data/sample_data.json')

    # Generate graphs
    line_graph = generate_line_graph(data)
    bar_graph = generate_bar_graph(data)

    # Save graphs to files
    save_graph_to_file(line_graph, 'line_graph.png')
    save_graph_to_file(bar_graph, 'bar_graph.png')

    # Display graphs
    plt.show()

if __name__ == "__main__":
    main()