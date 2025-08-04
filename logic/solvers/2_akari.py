from .claspy import *
from . import utils
from .utils.solutions import *

def encode(string):
    return utils.encode(string, clue_encoder = lambda s : s)
    
def solve(E):
    # BoolVar that is True iff (r,c) has a lightbulb
    bools = [[BoolVar() for c in range(E.C)] for r in range(E.R)]
    
    # ENFORCE THAT BLACK CELLS CAN'T HAVE LIGHTBULBS
    for (r,c) in E.clues:
        require(~bools[r][c])

    # ENFORCE THAT NUMBERED CLUES ARE CORRECT
    for (r,c) in E.clues:
        if E.clues[(r,c)].isnumeric():
            # require that contents[(r,c)] equals the number
            # of true BoolVars for the (up to four) adjacent cells
            require(sum_bools(int(E.clues[(r,c)]),
                [ bools[r+dr][c+dc] for (dr,dc) in ((0,1),(1,0),(0,-1),(-1,0))
                    if 0 <= r+dr < E.R and 0 <= c+dc < E.C ]))

    # ENFORCE THAT EVERY CELL IS LIT UP,
    # AND THAT NO TWO LIGHTBULBS SEE EACH OTHER
    for r in range(E.R):
        for c in range(E.C):
            if (r,c) not in E.clues:
                # get all other cells from which (r,c) might be lit up
                visible_cells = []
                for (dr,dc) in (0,1),(1,0),(0,-1),(-1,0):
                    i = 1
                    while True:
                        r1, c1 = r+i*dr, c+i*dc
                        if 0 <= r1 < E.R and 0 <= c1 < E.C and (r1,c1) not in E.clues:
                            visible_cells.append((r1,c1))
                        else:
                            break
                        i += 1
                # now, either (r,c) has a lightbulb and none of visible_cells does,
                # or (r,c) doesn't have a lightbulb and at least one of visible_cells does
                require(bools[r][c] != at_least(1, [bools[x][y] for (x,y) in visible_cells]))

    return get_all_grid_solutions(bools,
        format_function = lambda r, c: 'bulb.png' if bools[r][c].value() else '')
   
def decode(solutions):
    return utils.decode(solutions)
