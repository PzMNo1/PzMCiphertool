from .claspy import *
from . import utils
from .utils.grids import *
from .utils.solutions import *

neighbor_offsets = ((-1, 0), (0, 1), (1, 0), (0, -1))

def encode(string):
    return utils.encode(string, clue_encoder = lambda s: s)
    
def solve(E):
    # --- Validation ---
    for x in set(E.top.values()).union(E.left.values()):
        if not(x.isnumeric() or x == ''):
            raise ValueError('Clues along the sides must be integers.')
    for x in E.clues.values():
        if x not in 'ne':
            raise ValueError('Clues inside the grid must be tents or trees.')

    grid = [[MultiVar('n', 'e', '') for c in range(E.C)] for r in range(E.R)]

    # For each coordinate of a tree, maintain a list of BoolVars for 
    # whether it is "connected to" its top, right, bottom, left.
    tree_clues = {}

    # --- Basic tent / tree rules ---
    for r in range(E.R):
        for c in range(E.C):
            if (r, c) in E.clues:
                value = E.clues[(r,c)]
                # If tent/tree is provided, there must be a tent/tree there.
                require(grid[r][c] == value)
                # Bookkeeping for tree clues.
                if value == 'e':
                    tree_clues[(r,c)] = [BoolVar() for i in range(4)]
            else:
                # If a cell is not provided as a clue, it cannot be a tree.
                require(grid[r][c] != 'e')

    for (r, c), conns in tree_clues.items():
        for i, (dy, dx) in enumerate(neighbor_offsets):
            y, x = r+dy, c+dx
            if is_valid_coord(E.R, E.C, y, x):
                # If a tree is "connected" in some direction, there must be a tent there
                require((grid[y][x] == 'n') | ~conns[i])
            else:
                # If there's nothing in a certain direction, tree cannot be connected to it
                require(~conns[i])
    
    for conns in tree_clues.values():
        # Each tree is connected to exactly 1 tent
        require(sum_bools(1, conns))

    for r in range(E.R):
        for c in range(E.C):
            # If (r, c) has tent, none of surroundings can be tent.
            require(
                at_most(0, [grid[y][x] == 'n' for (y, x) in get_surroundings(E.R, E.C, r, c)]) | 
                (grid[r][c] != 'n')
            )
            # If (r, c) has tent, there must be exactly one tree connected to it.
            possible_tree_conns = []
            for i, (dy, dx) in enumerate(neighbor_offsets):
                y, x = r+dy, c+dx
                if (y, x) in tree_clues:
                    possible_tree_conns.append(tree_clues[(y,x)][(i+2)%4])
            require(sum_bools(1, possible_tree_conns) | (grid[r][c] != 'n'))
    
    # Number of tents in cols / rows are correct.
    for c, value in E.top.items():
        if value != '':
            require(sum_bools(int(value), [grid[r][c] == 'n' for r in range(E.R)]))
    for r, value in E.left.items():
        if value != '':
            require(sum_bools(int(value), [grid[r][c] == 'n' for c in range(E.C)]))

    # Create solution
    def format_function(r, c):
        if grid[r][c].value() == 'n':
            return 'tent.png'
        elif grid[r][c].value() == 'e':
            return 'tree.png'
        return ''

    # The placement of trees and tents is all that matters;
    # tree-tent connections are not considered for duplicate checks.
    return get_all_grid_solutions(grid, format_function = format_function)

def decode(solutions):
    return utils.decode(solutions)
