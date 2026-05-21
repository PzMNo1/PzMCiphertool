from .claspy import *
from . import utils
from .utils.regions import *
from .utils.shading import *

def encode(string):
    return utils.encode(string, has_borders = True)
    
def solve(E):
    rooms = full_bfs(E.R, E.C, E.edges)

    room_to_clue = {}

    all_rooms_have_clues = True
    for room in rooms:
        has_clue = False
        for (r, c) in room:
            if (r, c) in E.clues:
                has_clue = True
                room_to_clue[room] = int(E.clues[(r,c)])
        if not has_clue:
            all_rooms_have_clues = False

    max_room_size = max(len(room) for room in rooms)
    max_clue = max(E.clues.values()) if E.clues else max_room_size
    
    # set the maximum IntVar value to the max count of shaded cells
    set_max_val(max_clue if all_rooms_have_clues else max_room_size)

    s = RectangularGridShadingSolver(E.R, E.C)
    
    # Numbers indicate how many shaded cells are in a region.
    for room in rooms:
        if room in room_to_clue:
            require(sum_bools(room_to_clue[room], [s.grid[r][c] for (r, c) in room]))

    # Shaded cells must form rectangles, independently of the region borders.

    # . represents the top left of a rectangle.
    # < represents the rest of the top row of a rectangle.
    # ^ represents the rest of the left column of a rectangle.
    # r represents the rest of the rectangle.
    
    # so a rectangle might look like this:
    #   .<<<<
    #   ^rrrr
    #   ^rrrr

    # space represents empty space.
    parent = [[MultiVar('.', '<', '^', 'r', ' ') for c in range(E.C)] for r in range(E.R)]
    for r in range(E.R):
        for c in range(E.C):
            require((parent[r][c] == ' ') == (~s.grid[r][c]))
            if r == 0:
                require(parent[r][c] != '^')
                require(parent[r][c] != 'r')
            else:
                require(~s.grid[r-1][c] | (parent[r][c] != '.'))
                is_space_left_empty = BoolVar(True) if c == 0 else ~s.grid[r][c-1]
                require((parent[r][c] == '^') == (s.grid[r][c] & var_in(parent[r-1][c], ('^', '.')) & is_space_left_empty))
            if c == 0:
                require(parent[r][c] != '<')
                require(parent[r][c] != 'r')
            else:
                require(~s.grid[r][c-1] | (parent[r][c] != '.'))
                is_space_above_empty = BoolVar(True) if r == 0 else ~s.grid[r-1][c] # Don't do this with grid indexing b/c it wraps on negatives :(
                require((parent[r][c] == '<') == (s.grid[r][c] & var_in(parent[r][c-1], ('<', '.')) & is_space_above_empty))
            if 0 < r and 0 < c:
                # Don't have an & s.grid[r][c] condition on RHS. We need to enforce rectangularness.
                require((parent[r][c] == 'r') == (s.grid[r-1][c] & s.grid[r][c-1] & s.grid[r-1][c-1]))

    return s.solutions(shaded_color = 'darkgray')
   
def decode(solutions):
    return utils.decode(solutions)
