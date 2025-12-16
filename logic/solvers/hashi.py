from .claspy import *
from . import utils
from .utils.solutions import *

# These definitions are different from the ones in loops utils because all bridges are straight
ISOLATED = ['', '.']
UP_CONNECTING = DOWN_CONNECTING = ['1']
LEFT_CONNECTING = RIGHT_CONNECTING = ['-']
ALL = ['', '.', '1', '-']

def encode(string):
    return utils.encode(string)

def solve(E):
    # max hashi clue is 8
    # ∄ positionally dependent IntVars such as region IDs or coords
    set_max_val(8)

    conn_patterns = [[MultiVar(*ALL) for c in range(E.C)] for r in range(E.R)]
    conn_nums = [[IntVar(0, 2) for c in range(E.C)] for r in range(E.R)]
    conn_atoms = [[Atom() for c in range(E.C)] for r in range(E.R)]

    # --- Relationships between patterns and nums ---
    for r in range(E.R):
        for c in range(E.C):
            # a pattern is ISOLATED iff it has 0 bridges
            require(var_in(conn_patterns[r][c], ISOLATED) == (conn_nums[r][c] == 0))

    # --- Bridge rules ---
    for r in range(E.R):
        for c in range(E.C):
            # Top / bottom edge rules
            if r == 0:
                require(~var_in(conn_patterns[r][c], UP_CONNECTING))
            if r == E.R - 1:
                require(~var_in(conn_patterns[r][c], DOWN_CONNECTING))
            # Left / right edge rules
            if c == 0:
                require(~var_in(conn_patterns[r][c], LEFT_CONNECTING))
            if c == E.C - 1:
                require(~var_in(conn_patterns[r][c], RIGHT_CONNECTING))
            # Other connectivity rules
            if 0 < r:
                # if the cell above connects down, this must connect up or be a root
                require(
                    var_in(conn_patterns[r][c], UP_CONNECTING+['.']) | 
                    ~var_in(conn_patterns[r-1][c], DOWN_CONNECTING)
                )
                conn_atoms[r][c].prove_if(
                    # atoms are connected
                    conn_atoms[r-1][c] & 
                    var_in(conn_patterns[r][c], UP_CONNECTING+['.']) & 
                    var_in(conn_patterns[r-1][c], DOWN_CONNECTING+['.']) &
                    ~((conn_patterns[r][c] == '.') & (conn_patterns[r-1][c] == '.'))
                )
                # if this connects up, make sure numbers are the same
                require(
                    ((conn_nums[r-1][c] == conn_nums[r][c]) | 
                    (conn_patterns[r][c] == '.') | 
                    (conn_patterns[r-1][c] == '.') |  ~var_in(conn_patterns[r][c], UP_CONNECTING+['.']))
                )
                    
            if r < E.R - 1:
                # if the cell below connects up, this must connect down or be a root
                require(
                    var_in(conn_patterns[r][c], DOWN_CONNECTING+['.']) | 
                    ~var_in(conn_patterns[r+1][c], UP_CONNECTING)
                )
                conn_atoms[r][c].prove_if(
                    # atoms are connected
                    conn_atoms[r+1][c] & 
                    var_in(conn_patterns[r][c], DOWN_CONNECTING+['.']) & 
                    var_in(conn_patterns[r+1][c], UP_CONNECTING+['.']) &
                    ~((conn_patterns[r][c] == '.') & (conn_patterns[r+1][c] == '.'))
                )
                # if this connects down, make sure numbers are the same
                require(
                    ((conn_nums[r+1][c] == conn_nums[r][c]) | 
                    (conn_patterns[r][c] == '.') | 
                    (conn_patterns[r+1][c] == '.')) |  ~var_in(conn_patterns[r][c], DOWN_CONNECTING+['.'])
                )
            if 0 < c:
                # if the cell to the left connects right, this must connect left or be a root
                require(
                    var_in(conn_patterns[r][c], LEFT_CONNECTING+['.']) | 
                    ~var_in(conn_patterns[r][c-1], RIGHT_CONNECTING)
                )
                conn_atoms[r][c].prove_if(
                    # atoms are connected
                    conn_atoms[r][c-1] & 
                    var_in(conn_patterns[r][c], LEFT_CONNECTING+['.']) & 
                    var_in(conn_patterns[r][c-1], RIGHT_CONNECTING+['.']) &
                    ~((conn_patterns[r][c] == '.') & (conn_patterns[r][c-1] == '.'))
                )
                # if this connects left, make sure numbers are the same
                require(
                    ((conn_nums[r][c-1] == conn_nums[r][c]) | 
                    (conn_patterns[r][c] == '.') | 
                    (conn_patterns[r][c-1] == '.')) |  ~var_in(conn_patterns[r][c], LEFT_CONNECTING+['.'])
                )
                    
            if c < E.C - 1:
                # if the cell to the right connects left, this must connect right or be a root
                require(
                    var_in(conn_patterns[r][c], RIGHT_CONNECTING+['.']) | 
                    ~var_in(conn_patterns[r][c+1], LEFT_CONNECTING)
                )
                conn_atoms[r][c].prove_if(
                    # atoms are connected
                    conn_atoms[r][c+1] & 
                    var_in(conn_patterns[r][c], RIGHT_CONNECTING+['.']) & 
                    var_in(conn_patterns[r][c+1], LEFT_CONNECTING+['.']) &
                    ~((conn_patterns[r][c] == '.') & (conn_patterns[r][c+1] == '.'))
                )
                # if this connects right, make sure numbers are the same
                require(
                    ((conn_nums[r][c+1] == conn_nums[r][c]) | 
                    (conn_patterns[r][c] == '.') | 
                    (conn_patterns[r][c+1] == '.')) |  ~var_in(conn_patterns[r][c], RIGHT_CONNECTING+['.'])
                )

    # The bridges have to be connected
    for r in range(E.R):
        for c in range(E.C):
            require(conn_atoms[r][c] == (conn_patterns[r][c] != ''))

    # --- Clue rules ---
    for r in range(E.R):
        for c in range(E.C):
            # root iff clue
            require((conn_patterns[r][c] == '.') == ((r, c) in E.clues))
    
    for (r, c) in E.clues:
        # number of bridges
        num_bridges = IntVar(0)
        # Other connectivity rules
        if 0 < r:
            num_bridges += cond(
                # atoms are connected
                var_in(conn_patterns[r-1][c], DOWN_CONNECTING),
                conn_nums[r-1][c], 0)
        if r < E.R - 1:
            num_bridges += cond(
                # atoms are connected
                var_in(conn_patterns[r+1][c], UP_CONNECTING),
                conn_nums[r+1][c], 0)
        if 0 < c:
            num_bridges += cond(
                # atoms are connected
                var_in(conn_patterns[r][c-1], RIGHT_CONNECTING),
                conn_nums[r][c-1], 0)
        if c < E.C - 1:
            num_bridges += cond(
                # atoms are connected
                var_in(conn_patterns[r][c+1], LEFT_CONNECTING),
                conn_nums[r][c+1], 0)
        if (r,c) in E.clues and E.clues[(r,c)] == '?':
            continue
        require(num_bridges == E.clues[(r, c)])
    
    # prove connectivity of the first node
    for (r, c) in E.clues:
        conn_atoms[r][c].prove_if(True)
        break

    # --- Compile the solution ---
    def format_function(r, c):
        if conn_nums[r][c].value() == 1:
            if conn_patterns[r][c].value() == '1':
                return '1.png'
            elif conn_patterns[r][c].value() == '-':
                return '-.png'
            else:
                raise ValueError('Expected a single connection to be either 1 or -')
        elif conn_nums[r][c].value() == 2:
            if conn_patterns[r][c].value() == '1':
                return '‖.png'
            elif conn_patterns[r][c].value() == '-':
                return '=.png'
            else:
                raise ValueError('Expected a double connection to be either ‖ or =')
        return ''

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
                x = x & (conn_patterns[r][c] == conn_patterns[r][c].value()) & \
                    (conn_nums[r][c] == conn_nums[r][c].value())
        require(~x)

    return get_all_solutions(generate_solution, avoid_duplicate_solution)

def decode(solutions):
    return utils.decode(solutions)
