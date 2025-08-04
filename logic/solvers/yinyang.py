from .claspy import *
from . import utils
from .utils.solutions import *

def encode(string):
    return utils.encode(string, clue_encoder = lambda s: s)
    
def solve(E):
    set_max_val(2)

    s = utils.shading.RectangularGridShadingSolver(E.R, E.C)

    # Optimize solving by providing known roots for white and black parts
    white_root, black_root = None, None
    for (r, c) in E.clues:
        if E.clues[(r,c)] == 'w':
            white_root = (r,c)
        else:
            black_root = (r,c)
        if white_root and black_root:
            break

    s.white_connectivity(white_root)
    s.black_connectivity(black_root)
    s.no_white_2x2()
    s.no_black_2x2()

    for (r, c) in E.clues:
        require(s.grid[r][c] == (E.clues[(r,c)] == 'b'))
    
    def format_function(r, c):
        return ('black' if s.grid[r][c].value() else 'white') + '_circle.png'

    return get_all_grid_solutions(s.grid, format_function = format_function)
   
def decode(solutions):
    return utils.decode(solutions)
