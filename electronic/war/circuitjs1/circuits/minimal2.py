import os
from collections import defaultdict

# Directory containing the text files
directory = "."

# Step 1: Parse files and track coverage
coverage = defaultdict(set)  # Maps a file to the (type, config) pairs it covers
all_requirements = set()     # All unique (type, config) pairs

for filename in os.listdir(directory):
    if filename.endswith(".txt"):
        filepath = os.path.join(directory, filename)
        with open(filepath, "r") as file:
            lines = file.readlines()[1:]  # Skip the first line
            for line in lines:
                parts = line.strip().split()
                if len(parts) < 5:
                    continue  # Skip malformed lines
                comp_type = parts[0]
                if comp_type == '32' or comp_type == '!' or comp_type == '38':
                    continue
                x, y, x2, y2 = map(float, parts[1:5])
                config = "vertical" if x == x2 else "horizontal"
                pair = (comp_type, config)
                coverage[filename].add(pair)
                all_requirements.add(pair)

# Step 2: Greedy algorithm to find minimal set of files
selected_files = set()
remaining_requirements = set(all_requirements)

while remaining_requirements:
    # Find the file that covers the most uncovered requirements
    best_file = max(coverage, key=lambda f: len(coverage[f] & remaining_requirements))
    selected_files.add(best_file)
    remaining_requirements -= coverage[best_file]  # Remove covered pairs

# Step 3: Write the minimal file list to an output file
output_file = "minimal_file_list.txt"
with open(output_file, "w") as file:
    file.writelines(f"{f}\n" for f in sorted(selected_files))

print(f"Minimal list of files saved to {output_file}.")

