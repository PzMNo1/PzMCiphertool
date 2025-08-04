from .claspy import *
from . import utils
from .utils.grids import *
from .utils.solutions import *

BATTLESHIPS = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1] # standard fleet

def encode(string):
    return utils.encode(string, clue_encoder = lambda s : s, outside_clues = '1001')
    
def solve(E):
    # IDs for which battleship something belongs to; if ID = len(BATTLESHIPS), not part of any
    max_id = len(BATTLESHIPS)
    set_max_val(max_id)

    grid = [[IntVar(0, max_id) for c in range(E.C)] for r in range(E.R)]

    # This solver is slow so put clue validation first
    # Clue satisfaction for water / ship parts
    for (r,c) in E.clues:
        value = E.clues[(r,c)]
        # 1x1 ship
        if value == 'o':
            require(grid[r][c] != max_id)
            for (y,x) in get_surroundings(E.R, E.C, r, c):
                require(grid[y][x] == max_id)
        # Top end of the ship (cell below must also be ship, and cell above,
        # if it exists, must be water)
        elif value == 'd':
            if r == E.R-1:
                raise ValueError('A ship is pointing off the bottom of the grid.')
            else:
                require(grid[r][c] != max_id)
                require(grid[r+1][c] == grid[r][c])
                if is_valid_coord(E.R, E.C, r-1, c):
                    require(grid[r-1][c] == max_id)
        # Right end of the ship (cell to the left must also be ship, and cell
        # to the right, if it exists, must be water)
        elif value == 'l':
            if c == 0:
                raise ValueError('A ship is pointing off the left of the grid.')
            else:
                require(grid[r][c] != max_id)
                require(grid[r][c-1] == grid[r][c])
                if is_valid_coord(E.R, E.C, r, c+1):
                    require(grid[r][c+1] == max_id)
        # Left end of the ship (cell to the right must also be ship, and cell
        # to the left, if it exists, must be water)
        elif value == 'r':
            if c == E.C - 1:
                raise ValueError('A ship is pointing off the right of the grid.')
            else:
                require(grid[r][c] != max_id)
                require(grid[r][c+1] == grid[r][c])
                if is_valid_coord(E.R, E.C, r, c-1):
                    require(grid[r][c-1] == max_id)
        # Bottom end of the ship (cell on top must also be ship, and cell below,
        # if it exists, must be water)
        elif value == 'u':
            if r == 0:
                raise ValueError('A ship is pointing off the top of the grid.')
            else:
                require(grid[r][c] != max_id)
                require(grid[r-1][c] == grid[r][c])    
                if is_valid_coord(E.R, E.C, r+1, c):
                    require(grid[r+1][c] == max_id)
        elif value == 'm':
            if 0 < r < E.R-1 and 0 < c < E.C-1:
                require(grid[r][c] != max_id)
                require(
                    (grid[r-1][c] == grid[r][c]) & (grid[r+1][c] == grid[r][c]) | # vertical
                    (grid[r][c-1] == grid[r][c]) & (grid[r][c+1] == grid[r][c])) # horiz
            else:
                raise ValueError('A ship is pointing off the edge of the grid.')
        # Water
        elif value == 'w':
            require(grid[r][c] == max_id)
    
    # Clue satisfaction for row / column counts
    for r in range(E.R):
        try:
            value = int(E.left[r])
            if value > E.C:
                raise ValueError('Sum clue is greater than # of columns.')
            elif value >= sum(BATTLESHIPS):
                raise ValueError('Sum clue is greater than # of battleship cells.')
            require(sum_bools(value, [grid[r][c] != max_id for c in range(E.C)]))
        except KeyError:
            pass
        except TypeError: 
            raise ValueError('Outside clues must be numbers.')
    for c in range(E.C):
        try:
            value = int(E.top[c])
            require(sum_bools(value, [grid[r][c] != max_id for r in range(E.R)]))
            if value > E.R:
                raise ValueError('Sum clue is greater than # of rows.')
            elif value >= sum(BATTLESHIPS):
                raise ValueError('Sum clue is greater than # of battleship cells.')
        except KeyError:
            pass
        except TypeError:
            raise ValueError('Outside clues must be numbers.')

    # Ship placement -- note: slooooooow
    for ship_id in range(max_id):
        length = BATTLESHIPS[ship_id]
        possible_configs = BoolVar(False)
        for r in range(E.R):
            for c in range(E.C):
                if is_valid_coord(E.R, E.C, r+length-1, c):
                    ship_vertical_starting_at_rc = BoolVar(True)
                    for y in range(E.R):
                        for x in range(E.C):
                            ship_vertical_starting_at_rc &= ((grid[y][x] == ship_id) == \
                                (r <= y < r+length and c == x))
                    possible_configs |= ship_vertical_starting_at_rc
                if is_valid_coord(E.R, E.C, r, c+length-1):
                    ship_horiz_starting_at_rc = BoolVar(True)
                    for y in range(E.R):
                        for x in range(E.C):
                            ship_horiz_starting_at_rc &= ((grid[y][x] == ship_id) == \
                                (r == y and c <= x < c+length))
                    possible_configs |= ship_horiz_starting_at_rc
        require(possible_configs)
    
    # Ships don't touch
    for r in range(E.R):
        for c in range(E.C):
            for (y,x) in get_surroundings(E.R, E.C, r, c):
                require((grid[r][c] == grid[y][x]) | (grid[y][x] == max_id) | (grid[r][c] == max_id))

    def equality_function(x, y):
        return (x == max_id) == (y == max_id)

    def format_function(r, c):
        is_shaded = grid[r][c].value() != max_id
        has_top_neighbor = False if r == 0 else grid[r][c].value() == grid[r-1][c].value()
        has_bottom_neighbor = False if r == E.R-1 else grid[r][c].value() == grid[r+1][c].value()
        has_left_neighbor = False if c == 0 else grid[r][c].value() == grid[r][c-1].value()
        has_right_neighbor = False if c == E.C-1 else grid[r][c].value() == grid[r][c+1].value()
        # water
        if not is_shaded:
            return ''
        # 1x1 ship
        if {has_top_neighbor, has_bottom_neighbor, has_left_neighbor, has_right_neighbor} == {False}:
            return 'large_black_circle.png'
        # middle part
        elif (has_top_neighbor and has_bottom_neighbor) or (has_left_neighbor and has_right_neighbor):
            return 'black.png'
        # top part
        elif {has_top_neighbor, has_left_neighbor, has_right_neighbor} == {False}:
            return 'battleship_top_end.png'
        # bottom part
        elif {has_bottom_neighbor, has_left_neighbor, has_right_neighbor} == {False}:
            return 'battleship_bottom_end.png'
        # left part
        elif {has_top_neighbor, has_bottom_neighbor, has_left_neighbor} == {False}:
            return 'battleship_left_end.png'
        # right part
        elif {has_top_neighbor, has_bottom_neighbor, has_right_neighbor} == {False}:
            return 'battleship_right_end.png'
        
    return get_all_grid_solutions(grid, 
        equality_function = equality_function, 
        format_function = format_function)

def decode(solutions):
    return utils.decode(solutions)
