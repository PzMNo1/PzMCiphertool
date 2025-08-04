from .claspy import *
from . import utils

def encode(string):
    return utils.encode(string, clue_encoder = lambda s: s)
    
def solve(E):
    number_clues, inside_clues, outside_clues = {}, set(), set()
    for clue, value in E.clues.items():
        if value.isnumeric():
            number_clues[clue] = int(value)
        elif value == 's':
            inside_clues.add(clue)
        elif value == 'w':
            outside_clues.add(clue)
        else:
            raise ValueError('Clues must be numbers, s, or w.')
    
    set_max_val(max(number_clues.values()) if number_clues else 0)

    bs = utils.RectangularGridBorderSolver(E.R, E.C)
    bs.loop()
    bs.clues(number_clues)
    bs.inside_loop(inside_clues)
    bs.outside_loop(outside_clues)
    return bs.solutions()
   
def decode(solutions):
    return utils.decode(solutions)
