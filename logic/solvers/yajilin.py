from .claspy import *
from . import utils

def encode(string):
    return utils.encode(string, clue_encoder = lambda s : s)

def solve(E):
    # Restrict the number of bits used for IntVar.
    # The highest number that we need is the highest clue number.
    set_max_val(max([int(clue[0][0]) for clue in E.clues.values() if clue != 'gray'], default=1))

    loop_solver = utils.RectangularGridLoopSolver(E.R, E.C, shading = True)
    shading_solver = utils.RectangularGridShadingSolver(
                        E.R, E.C, grid = loop_solver.grid, shading_symbols = ['.'])
    loop_solver.loop(E.clues, allow_blanks = False)
    shading_solver.no_adjacent()
    
    # ----CLUE RULES----
    
    for r in range(E.R):
        for c in range(E.C):
            # clues satisfied
            if (r, c) in E.clues:
                if E.clues[(r,c)] == 'gray':
                    require(loop_solver.grid[r][c] == '')
                else:
                    num_string = E.clues[(r,c)][0][0]
                    direction = E.clues[(r,c)][0][1]
                    # check the clue for validity
                    if not num_string.isnumeric() or direction not in 'lrud':
                        raise ValueError('Please ensure that each clue has both a number and a direction.')
                    
                    # build a list of coordinates that are "seen" by this clue
                    seen_cells = []
                    if direction == 'l':
                        seen_cells = [(r,x) for x in range(0, c)]
                    elif direction == 'r':
                        seen_cells = [(r,x) for x in range(c+1, E.C)]
                    elif direction == 'u':
                        seen_cells = [(y,c) for y in range(0, r)]
                    elif direction == 'd':
                        seen_cells = [(y,c) for y in range(r+1, E.R)]
                    # get a list of boolean variables that tell you whether the cells are shaded
                    shaded_seen = [BoolVar(loop_solver.grid[y][x] == '.') for (y,x) in seen_cells]
                    # require that exactly 'num' of the cells are shaded
                    require(sum_bools(int(num_string), shaded_seen))
    
    return loop_solver.solutions()
    
def decode(solutions):
    return utils.decode(solutions)
