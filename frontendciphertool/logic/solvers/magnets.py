from .claspy import *
from . import utils
from .utils import borders

def encode(string):
    return utils.encode(string, has_borders = True, outside_clues = '1111')

def solve(E):
    rooms = utils.regions.full_bfs(E.R, E.C, E.edges)

    for room in rooms:
        if len(room) != 2:
            raise ValueError('All regions must be of size 2.')

    set_max_val(3)
    grid = utils.RectangularGrid(E.R, E.C, lambda : MultiVar('+', '-', ' '))
    
    # Require that the number of +s is equal to the number of -s; so either there's one of each or none
    for room in rooms:
        require(
            sum_vars([grid[r][c] == '+' for (r, c) in room]) == sum_vars([grid[r][c] == '-' for (r, c) in room])
        )

    # Require neighbor conditions
    for r in range(E.R):
        for c in range(E.C):
            require(
                # None of the neighbors have the same value as this, or this is blank (neighbors can be anything)
                (sum_bools(0, [(grid[y][x] == grid[r][c]) for (y, x) in grid.get_neighbors(r, c)]) |
                    (grid[r][c] == ' '))
            )
    
    # Require correctness of + (top and left) clues
    for c in E.top:
        require(sum_bools(E.top[c], [(grid[r][c] == '+') for r in range(E.R)]))
    for r in E.left:
        require(sum_bools(E.left[r], [(grid[r][c] == '+') for c in range(E.C)]))
    
    # Require correctness of - (bottom and right) clues
    for c in E.bottom:
        require(sum_bools(E.bottom[c], [(grid[r][c] == '-') for r in range(E.R)]))
    for r in E.right:
        require(sum_bools(E.right[r], [(grid[r][c] == '-') for c in range(E.C)]))

    return utils.solutions.get_all_grid_solutions(grid)

def decode(solutions):
    return utils.decode(solutions)