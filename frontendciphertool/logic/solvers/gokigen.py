from .claspy import *
from . import utils
from .utils.grids import *
from .utils.solutions import *
from enum import Enum

# --- A literal army of helper functions ---
Direction = Enum('Direction', 'TL TR BR BL SELF NONE')
directions = [Direction.TL, Direction.TR, Direction.BR, Direction.BL, 
    Direction.SELF, Direction.NONE]

def tuple_sum(t1, t2):
    '''
    Given tuples t1 and t2, calculates their "sum" (value-by-value).
    '''
    if len(t1) != len(t2):
        raise ValueError('Tuples not same length')
    res = []
    for i in range(len(t1)):
        res.append(t1[i] + t2[i])
    return tuple(res)

def round_tuple(t):
    '''
    Given tuple t of number values, rounds each value and converts it to int.
    '''
    res = []
    for i in range(len(t)):
        res.append(int(round(t[i])))
    return tuple(res)

def inverse(t):
    '''
    Multiplies tuple t by -1, value-by-value.
    '''
    res = []
    for i in range(len(t)):
        res.append(t[i] * -1)
    return tuple(res)

# "Grid offsets" for the 4 commonly-used directions. 
# Notice that these are fractional.
dir_to_offset = {
    Direction.TL: (-.5, -.5),
    Direction.TR: (-.5, .5),
    Direction.BR: (.5, .5),
    Direction.BL: (.5, -.5)
}

# String representations of the 4 commonly-used directions.
dir_to_str = {
    Direction.TL: 'tl',
    Direction.TR: 'tr',
    Direction.BR: 'br',
    Direction.BL: 'bl'
}

def opposite(d):
    '''
    Given a direction, finds its opposite.
    '''
    if d == Direction.TL:
        return Direction.BR
    elif d == Direction.TR:
        return Direction.TL
    elif d == Direction.BR:
        return Direction.TL
    elif d == Direction.BL:
        return Direction.TR
    return d

def offset(d):
    '''
    Given a direction, finds its offset (fractional).
    '''
    return dir_to_offset[d]

# def direction(t):
#     '''
#     Given a tuple offset, finds the corresponding direction.
#     '''
#     for d in dir_to_offset:
#         if dir_to_offset[d] == t:
#             return d

def neighbors(r, c, direction, rows, cols):
    '''
    Given a grid coordinate, (r, c), a direction, and the # rows, cols
    of a grid overall, returns:
     - needed: a list of (y, x, d) tuples where (y, x) is the center point of
    a grid cell and d is a direction of connection
        ~ this tells you which lines must be active if (r, c, direction) is active
     - incompatible: list of (y, x, d) which cannot be active if (r, c, direction)
    is active
    '''
    needed, incompatible = [], []
    coord = tuple_sum((r, c), offset(direction))
    for d, delta in dir_to_offset.items():
        y, x = round_tuple(tuple_sum(coord, inverse(delta)))
        if is_valid_coord(rows, cols, y, x):
            if offset(direction) == inverse(delta):
                needed.append((y, x, d))
            elif (y, x) != (r, c):
                incompatible.append((y, x, d))
    return needed, incompatible

def every(l):
    '''
    If l is empty, returns False; otherwise returns & of all BoolVars in l.
    '''
    if len(l) > 0:
        return at_least(len(l), l)
    return False

def none(l):
    '''
    If l is empty, returns True; otherwise returns & of nots of all BoolVars in l.
    '''
    if len(l) > 0:
        return at_most(0, l)
    return True

# --- End helper functions, begin solver content ---
def encode(string):
    return utils.encode(string)

def solve(E):
    set_max_val(len(directions)) # Max gokigen clue is 4, need IntVars for MultiVar

    grid = [[{d: BoolVar() for d in directions[:4]} for c in range(E.C)] for r in range(E.R)]
    parent = [[MultiVar(*directions) for c in range(E.C)] for r in range(E.R)]
    conn = [[Atom() for c in range(E.C)] for r in range(E.R)]

    # --- General "shape" rules ---
    for r in range(E.R):
        for c in range(E.C):
            dir_conn = BoolVar(False)
            loop_detector = BoolVar(False)

            for direction in dir_to_offset:
                needed, incompatible = neighbors(r, c, direction, E.R, E.C)
                require(every([grid[y][x][d] for (y, x, d) in needed]) |
                    ~grid[r][c][direction])
                require(none([grid[y][x][d] for (y, x, d) in incompatible]) | 
                    ~grid[r][c][direction])

                # If there is some compatible edge
                if len(needed) > 0:
                    y, x, d = needed[0]
                    # Prove connectivity if (y, x) is our parent and (y, x) is connected
                    # and also 'this' is not the parent of (y, x) -> NO CYCLES
                    dir_conn |= (parent[r][c] == direction) & \
                        conn[y][x] & \
                        (parent[y][x] != d)
                    # If parent(y, x) points away from us, track that for loop detection.
                    loop_detector |= (parent[y][x] == direction)

                    # If two things are connected, there is a parent-child relationship.
                    # Important to avoid parent-pointing at each other
                    # or everyone being their own parent.
                    require(
                        sum_bools(1, [parent[y][x] == d, parent[r][c] == direction]) |
                            ~grid[r][c][direction]
                    )

            # Prove if this is a root or if the OR statement we defined above is ok.
            conn[r][c].prove_if(
                (parent[r][c] == Direction.SELF) |
                dir_conn
            )

            # Deal with logic when this node has no connections.
            no_conns = at_most(0, [grid[r][c][direction] for direction in dir_to_offset])
            require(conn[r][c] != no_conns)
            require((parent[r][c] == Direction.NONE) == no_conns)

            # NO LOOPS.
            require(~((parent[r][c] == Direction.SELF) & loop_detector))
    
    # Make sure that every box has a diagonal line in it.
    for r in range(E.R-1):
        for c in range(E.C-1):
            require(grid[r][c][Direction.BR] | grid[r][c+1][Direction.BL])

    # --- Clue rules ---
    for ((r, c), value) in E.clues.items():
        if value == '?':
            continue
        total = IntVar(0)
        for d in dir_to_offset:
            total += cond(grid[r][c][d], 1, 0)
        require(total == value)

    # --- Compile the solution ---
    def format_function(r, c):
        name = ''
        for d in directions[:4]:
            if grid[r][c][d].value():
                name += dir_to_str[d]
        if name == '':
            return name
        return name + '.png'

    def generate_solution():
        solution = {}
        for r in range(E.R):
            for c in range(E.C):
                cell_output = format_function(r, c)
                if cell_output != '':
                    solution[rc_to_grid(r,c)] = cell_output
        return solution

    def avoid_duplicate_solution():
        x = BoolVar(True)
        for r in range(E.R):
            for c in range(E.C):
                for d in directions[:4]:
                    x &= (grid[r][c][d] == grid[r][c][d].value())
        require(~x)

    return get_all_solutions(generate_solution, avoid_duplicate_solution)

def decode(solutions):
    return utils.decode(solutions)
