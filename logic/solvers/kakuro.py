from .claspy import *
from . import utils
from .utils.solutions import *

def encode(string):
    return utils.encode(string)
    
def solve(E):
    # Find sections and their corresponding clues
    # Maintain a list of tuples (sum, [(r1, c1), (r2, c2), ...]).
    # 'sum' is 0 when the clue is blank; this is because we need to
    # check every run for duplicates.
    sums = []

    def end_run(start_coord, coords, idx):
        if start_coord in E.clues:
            value = E.clues[start_coord]
            if len(coords) > 0:
                if value == 'black':
                    sums.append((0, coords))
                else:
                    sums.append((value[idx], coords))
            elif value != 'black' and value[idx] != 0:
                return False
        else:
            sums.append((0, coords))
        return True
    
    # Across sections
    for r in range(E.R):
        start_coord = (r, -1)
        coords = []
        for c in range(E.C):
            if (r, c) in E.clues:
                if not end_run(start_coord, coords, 0):
                    return []
                start_coord = (r, c)
                coords = []
            else:
                coords.append((r,c))
        end_run(start_coord, coords, 0)
    # Down sections
    for c in range(E.C):
        start_coord = (-1, c)
        coords = []
        for r in range(E.R):
            if (r, c) in E.clues:
                if not end_run(start_coord, coords, 1):
                    return []
                start_coord = (r, c)
                coords = []
            else:
                coords.append((r,c))
        end_run(start_coord, coords, 1)
    
    # Solve the puzzle!
    grid = [[IntVar(0, 9) for c in range(E.C)] for r in range(E.R)]

    for sum_clue, coord_list in sums:
        intvars = [grid[r][c] for (r, c) in coord_list]
        if sum_clue:
            require(sum_clue == sum(intvars))
        if len(intvars) > 1: # require_all_diff throws an error if there's only 1 item
            require_all_diff(intvars)
    
    for r in range(E.R):
        for c in range(E.C):
            require((grid[r][c] == 0) == ((r,c) in E.clues))

    return get_all_grid_solutions(grid, 
        format_function = lambda r, c: grid[r][c].value() if grid[r][c].value() else '')
   
def decode(solutions):
    return utils.decode(solutions)
