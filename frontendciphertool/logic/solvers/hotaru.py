from .claspy import *
from . import utils
from .utils.loops import *
from .utils.solutions import *

def encode(string):
    return utils.encode(string, clue_encoder = lambda l: l)

def solve(E):
    ALL = DIRECTED+['.']
    max_possible_turns =  0
    bad_clue_format = 'Please ensure that each clue has a direction and has a number (or is blank).'
    for (r, c) in E.clues:
        value = E.clues[(r,c)]
        if len(value) == 1:
            if value not in 'lrud':
                raise ValueError(bad_clue_format)
            max_possible_turns = E.R * E.C - len(E.clues)
        elif len(value) == 2:
            num_string, direction = value
            # check the clue for validity
            if not (num_string.isnumeric() or num_string == '') or direction not in 'lrud':
                raise ValueError(bad_clue_format)
            if (direction == 'l' and c == 0) or (direction == 'r' and c == E.C-1) or \
                    (direction == 'u' and r == 0) or (direction == 'd' and r == E.R-1):
                raise ValueError('Beams cannot point off the grid.')
            
            # if one of the clues is blank, we could have a lot of turns
            if num_string == '':
                max_possible_turns = E.R * E.C - len(E.clues)
            else:
                max_possible_turns = max(max_possible_turns, int(num_string))
        else:
            raise ValueError(bad_clue_format)

    # The largest integer we need is determined by the MultiVar and max # turns
    set_max_val(max(len(ALL), max_possible_turns))

    # Beam paths; . represents clue
    conn_patterns = [[MultiVar(*ALL) for c in range(E.C)] for r in range(E.R)]

    # Atoms to keep track of connectivity for the entire puzzle
    overall_conn_atoms = [[Atom() for c in range(E.C)] for r in range(E.R)]

    # Atoms to keep track of connectivity for each individual clue
    clue_conn_atoms = [[Atom() for c in range(E.C)] for r in range(E.R)]

    # Count turns on each path.
    upstream_turn_counts = [[IntVar(0, max_possible_turns) for c in range(E.C)] for r in range(E.R)]

    # --- Beam rules ---
    for r in range(E.R):
        for c in range(E.C):
            # --- Top / bottom edge rules ---
            if r == 0:
                require(~var_in(conn_patterns[r][c], TOP_IN+TOP_OUT))
            if r == E.R - 1:
                require(~var_in(conn_patterns[r][c], BOTTOM_IN+BOTTOM_OUT))
            # --- Left / right edge rules ---
            if c == 0:
                require(~var_in(conn_patterns[r][c], LEFT_IN+LEFT_OUT))
            if c == E.C - 1:
                require(~var_in(conn_patterns[r][c], RIGHT_IN+RIGHT_OUT))
            # --- Value definitions useful for upstream counting ---
            num_turns_here = cond(var_in(conn_patterns[r][c], DIRECTED_BENDS), 1, 0)
            upstream_contribution = cond(conn_patterns[r][c] == '.', 0, upstream_turn_counts[r][c])
            # --- Other connectivity rules ---
            if 0 < r:
                # Cover cases where this cell has flow in from the top.
                # Cases where top cell has flow in from the bottom will be covered in the r < E.R - 1 section.
                
                # Basic rules (no dangling edges)
                require(var_in(conn_patterns[r][c], TOP_IN+['.']) |
                    ~var_in(conn_patterns[r-1][c], BOTTOM_OUT)
                )

                # Flow & connectivity rules

                # we're calculating *upstream* counts, so if flow looks like
                # 1 > 2 > 3 
                # then 1 is upstream from 2, which is upstream from 3
                # (follow the arrows backwards)
                # Roots *contribute* 0 to upstream counts (they are the "ends" of each path/stream)
                flow_from_top = (var_in(conn_patterns[r-1][c], BOTTOM_OUT) |
                    ((conn_patterns[r-1][c] == '.') & var_in(conn_patterns[r][c], TOP_IN)))
                # if we have flow from top, this cell affects the cell above's upstream count
                require((upstream_turn_counts[r-1][c] == upstream_contribution + num_turns_here) |
                    ~flow_from_top)
                # clue connectivity
                clue_conn_atoms[r][c].prove_if(clue_conn_atoms[r-1][c] & flow_from_top)
                # overall connectivity
                overall_conn_atoms[r][c].prove_if(
                    overall_conn_atoms[r-1][c] & 
                    # any connection to the top is fine
                    # we need both conditions because one side could be root
                    (var_in(conn_patterns[r][c], TOP_IN+TOP_OUT) |
                        var_in(conn_patterns[r-1][c], BOTTOM_IN+BOTTOM_OUT))
                )
            if r < E.R - 1:
                # Cases where this cell has flow in from the bottom.

                # Basic rules (no dangling edges)
                require(var_in(conn_patterns[r][c], BOTTOM_IN+['.']) |
                    ~var_in(conn_patterns[r+1][c], TOP_OUT)
                )

                # Flow & connectivity rules
                flow_from_bottom = (var_in(conn_patterns[r+1][c], TOP_OUT) |
                    ((conn_patterns[r+1][c] == '.') & var_in(conn_patterns[r][c], BOTTOM_IN)))
                # if we have flow from bottom, this cell affects the cell below's upstream count
                require((upstream_turn_counts[r+1][c] == upstream_contribution + num_turns_here) |
                    ~flow_from_bottom)
                # upstream counting
                clue_conn_atoms[r][c].prove_if(clue_conn_atoms[r+1][c] & flow_from_bottom)
                # overall connectivity
                overall_conn_atoms[r][c].prove_if(
                    overall_conn_atoms[r+1][c] & 
                    # any connection to the bottom is fine
                    # we need both conditions because one side could be root
                    (var_in(conn_patterns[r][c], BOTTOM_IN+BOTTOM_OUT) |
                        var_in(conn_patterns[r+1][c], TOP_IN+TOP_OUT))
                )
            if 0 < c:
                # Cases where this cell has flow in from the left.

                # Basic rules (no dangling edges)
                require(var_in(conn_patterns[r][c], LEFT_IN+['.']) |
                    ~var_in(conn_patterns[r][c-1], RIGHT_OUT)
                )

                # Flow & connectivity rules
                flow_from_left = (var_in(conn_patterns[r][c-1], RIGHT_OUT) |
                    ((conn_patterns[r][c-1] == '.') & var_in(conn_patterns[r][c], LEFT_IN)))
                # if we have flow from left, this cell affects the left cell's upstream count
                require((upstream_turn_counts[r][c-1] == upstream_contribution + num_turns_here)  |
                    ~flow_from_left)
                # clue connectivity
                clue_conn_atoms[r][c].prove_if(clue_conn_atoms[r][c-1] & flow_from_left)
                # overall connectivity
                overall_conn_atoms[r][c].prove_if(
                    overall_conn_atoms[r][c-1] & 
                    # any connection to the left is fine
                    # we need both conditions because one side could be root
                    (var_in(conn_patterns[r][c], LEFT_IN+LEFT_OUT) |
                        var_in(conn_patterns[r][c-1], RIGHT_IN+RIGHT_OUT))
                )
            if c < E.C - 1:
                # Cases where this cell has flow in from the right.

                # Basic rules (no dangling edges)
                require(var_in(conn_patterns[r][c], RIGHT_IN+['.']) |
                    ~var_in(conn_patterns[r][c+1], LEFT_OUT)
                )

                # Flow & connectivity rules
                flow_from_right = (var_in(conn_patterns[r][c+1], LEFT_OUT) |
                    ((conn_patterns[r][c+1] == '.') & var_in(conn_patterns[r][c], RIGHT_IN)))
                # if we have flow from right, this cell affects the right cell's upstream count
                require((upstream_turn_counts[r][c+1] == upstream_contribution + num_turns_here)  |
                    ~flow_from_right)
                # clue connectivity
                clue_conn_atoms[r][c].prove_if(clue_conn_atoms[r][c+1] & flow_from_right)
                # overall connectivity
                overall_conn_atoms[r][c].prove_if(
                    overall_conn_atoms[r][c+1] & 
                    # any connection to the right is fine
                    # we need both conditions because one side could be root
                    (var_in(conn_patterns[r][c], RIGHT_IN+RIGHT_OUT) |
                        var_in(conn_patterns[r][c+1], LEFT_IN+LEFT_OUT))
                )
            # --- Rules that apply no matter what ---
            # Cells are connected iff they are nonempty
            require(clue_conn_atoms[r][c] == (conn_patterns[r][c] != ''))
            require(overall_conn_atoms[r][c] == (conn_patterns[r][c] != ''))

    # --- Clue rules ---
    for r in range(E.R):
        for c in range(E.C):
            is_clue = (r,c) in E.clues
            # root iff clue
            require((conn_patterns[r][c] == '.') == is_clue)
            clue_conn_atoms[r][c].prove_if(is_clue)
    
    for (r, c) in E.clues:
        num_string = ''
        value = E.clues[(r,c)]
        if len(value) == 1:
            direction = value
        else:
            num_string, direction = value
        # If a clue is 'up' (i.e. beam comes out of the top), there must be an outgoing beam
        # from the top, and there must not be an outgoing beam from any other side. Similar for d,l,r.
        num = 0 if num_string == '' else int(num_string)
        if 0 < r:
            require((direction == 'u') == (var_in(conn_patterns[r-1][c], BOTTOM_IN)))
        if r < E.R - 1:
            require((direction == 'd') == (var_in(conn_patterns[r+1][c], TOP_IN)))
        if 0 < c:
            require((direction == 'l') == (var_in(conn_patterns[r][c-1], RIGHT_IN)))
        if c < E.C - 1:
            require((direction == 'r') == (var_in(conn_patterns[r][c+1], LEFT_IN)))
        require((upstream_turn_counts[r][c] == num) | (num_string == ''))

    # prove connectivity of the first node
    for (r, c) in E.clues:
        overall_conn_atoms[r][c].prove_if(True)
        break

    # --- Generate the solution ---
    def format_function(r, c):
        pattern = conn_patterns[r][c].value()
        if pattern in ISOLATED:
            return ''
        return DIRECTIONAL_PAIR_TO_UNICODE[pattern] + '.png'

    return get_all_grid_solutions(conn_patterns, format_function = format_function)

def decode(solutions):
    return utils.decode(solutions)
