from .claspy import *
from . import utils
from .utils import loops

def encode(string):
    return utils.encode(string, clue_encoder = lambda s : s)
    
def solve(E):
    path_clues = {}
    wind_clues = {}
    shaded_cells = set()
    for coord in E.clues:
        if E.clues[coord] == 'black':
            shaded_cells.add(coord)
        elif E.clues[coord] in 'URDL':
            wind_clues[coord] = E.clues[coord]
        elif E.clues[coord] in 'urdl':
            path_clues[coord] = E.clues[coord].upper()
        else:
            raise RuntimeError('Clue not one of \'black\' or [URDLurdl]')
    loop_solver = utils.RectangularGridLoopSolver(E.R, E.C, directed = True, shading = True)
    loop_solver.loop(wind_clues)
    
    for (r, c) in path_clues:
        clue = path_clues[(r, c)]
        if clue == 'L':
            require(loop_solver.grid[r][c] == '-<')
        elif clue == 'R':
            require(loop_solver.grid[r][c] == '->')
        elif clue == 'U':
            require(loop_solver.grid[r][c] == '1^')
        elif clue == 'D':
            require(loop_solver.grid[r][c] == '1v')

    for (r, c) in wind_clues:
        clue = wind_clues[(r, c)]
        if clue == 'L':
            for x in range(c-1, -1, -1):
                if (r, x) in wind_clues or (r, x) in shaded_cells:
                    break
                require(var_in(loop_solver.grid[r][x],
                    loops.RIGHT_IN + loops.LEFT_OUT + ['']))
        elif clue == 'R':
            for x in range(c+1, E.C):
                if (r, x) in wind_clues or (r, x) in shaded_cells:
                    break
                require(var_in(loop_solver.grid[r][x],
                    loops.LEFT_IN + loops.RIGHT_OUT + ['']))
        elif clue == 'U':
            for y in range(r-1, -1, -1):
                if (y, c) in wind_clues or (y, c) in shaded_cells:
                    break
                require(var_in(loop_solver.grid[y][c],
                    loops.BOTTOM_IN + loops.TOP_OUT + ['']))
        elif clue == 'D':
            for y in range(r+1, E.R):
                if (y, c) in wind_clues or (y, c) in shaded_cells:
                    break
                require(var_in(loop_solver.grid[y][c],
                    loops.TOP_IN + loops.BOTTOM_OUT + ['']))

    
    for r in range(E.R):
        for c in range(E.C):
            require((loop_solver.grid[r][c] == '.') ==
                ((r, c) in shaded_cells))

    def format_function(r, c):
        direction_pair = loop_solver.grid[r][c].value()
        if direction_pair == '':
            return direction_pair
        elif direction_pair == '.':
            return 'black'
        else:
            uni = loops.DIRECTIONAL_PAIR_TO_UNICODE[direction_pair] + '.png'
            return uni
        
    return loop_solver.solutions(format_function = format_function)

def decode(solutions):
    return utils.decode(solutions)
