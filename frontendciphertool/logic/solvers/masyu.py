from .claspy import *
from . import utils

def encode(string):
    def string_encoder(string):
        if string not in {'w', 'b', ''}:
            raise ValueError('Invalid input: cells must be w, b, or empty')
        return string
    return utils.encode(string, string_encoder)
    
def solve(E):
    loop_solver = utils.RectangularGridLoopSolver(E.R, E.C)
    loop_solver.loop(E.clues, includes_clues = True)

    # ----- CLUE ATTRIBUTES -----
    TURNING = ['J', '7', 'L', 'r']
    STRAIGHT = ['-', '1']
    
    for (r, c) in E.clues:
        # ----- BLACK CIRCLE RULES -----
        
        if E.clues[(r,c)] == 'b':
            require(var_in(loop_solver.grid[r][c], TURNING))

            # not leftmost
            if 0 <= c-1:
                # if not leftmost and not topmost
                if 0 <= r-1:
                    # if a cell looks like J,
                    # the cells above and to the left of it must be straight
                    require(
                        (var_in(loop_solver.grid[r-1][c], STRAIGHT) &
                            var_in(loop_solver.grid[r][c-1], STRAIGHT)) |
                                (loop_solver.grid[r][c] != 'J'))
                # if not leftmost and not bottommost
                if r+1 < E.R:
                    # if a cell looks like 7,
                    # the cells below and to the left of it must be straight
                    require(
                        (var_in(loop_solver.grid[r+1][c], STRAIGHT) &
                            var_in(loop_solver.grid[r][c-1], STRAIGHT)) |
                                (loop_solver.grid[r][c] != '7'))
            # not rightmost
            if c+1 < E.C:
                # if not rightmost and not topmost
                if 0 <= r-1:
                    # if a cell looks like L,
                    # the cells above and to the right of it must be straight
                    require(
                        (var_in(loop_solver.grid[r-1][c], STRAIGHT) &
                            var_in(loop_solver.grid[r][c+1], STRAIGHT)) |
                                (loop_solver.grid[r][c] != 'L'))
                # if not rightmost and not bottommost
                if r+1 < E.R:
                    
                    # if a cell looks like r,
                    # the cells below and to the right of it must be straight
                    require(
                        (var_in(loop_solver.grid[r+1][c], STRAIGHT) &
                            var_in(loop_solver.grid[r][c+1], STRAIGHT)) |
                                (loop_solver.grid[r][c] != 'r'))

        # ----- WHITE CIRCLE RULES -----
        
        else:
            require(var_in(loop_solver.grid[r][c], STRAIGHT))

            # if the line is horizontal,
            # at least one of the cells to the left and right is a turn
            if 0 < c and c < E.C-1:
                require(
                    var_in(loop_solver.grid[r][c-1], TURNING) |
                            var_in(loop_solver.grid[r][c+1], TURNING) |
                             (loop_solver.grid[r][c] != '-'))
                
            # if the line is vertical,
            # at least one of the cells to the top and bottom is a turn
            if 0 < r and r < E.R-1:
                require(
                    var_in(loop_solver.grid[r-1][c], TURNING) |
                            var_in(loop_solver.grid[r+1][c], TURNING) |
                             (loop_solver.grid[r][c] != '1'))
        
    return loop_solver.solutions()

def decode(solutions):
    return utils.decode(solutions)
