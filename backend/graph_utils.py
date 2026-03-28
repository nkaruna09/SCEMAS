def generate_line_graph(data):
    import matplotlib.pyplot as plt

    x = [item['x'] for item in data]
    y = [item['y'] for item in data]

    plt.figure(figsize=(10, 5))
    plt.plot(x, y, marker='o')
    plt.title('Line Graph')
    plt.xlabel('X-axis')
    plt.ylabel('Y-axis')
    plt.grid()
    plt.tight_layout()
    return plt


def generate_bar_graph(data):
    import matplotlib.pyplot as plt

    categories = [item['category'] for item in data]
    values = [item['value'] for item in data]

    plt.figure(figsize=(10, 5))
    plt.bar(categories, values, color='skyblue')
    plt.title('Bar Graph')
    plt.xlabel('Categories')
    plt.ylabel('Values')
    plt.xticks(rotation=45)
    plt.tight_layout()
    return plt


def save_graph_to_file(graph, filename):
    graph.savefig(filename)
    plt.close(graph)