from .claspy import *
from . import utils
from .utils.solutions import *

def encode(string):
    return utils.encode(string, clue_encoder = lambda s: s)
    
def solve(E):
    use_all_cells = E.params['Use all cells']

    locations = {}
    for (r,c), n in E.clues.items():
        locations[n] = locations.get(n,[]) + [(r,c)]

    # check that puzzle makes sense
    assert len(locations) > 0, "Error: The grid is empty!"
    for n, pair in locations.items():
        assert len(pair) <= 2, f"Error: There are more than two occurrences of {n}"
        assert len(pair) >= 2, f"Error: There is only one occurrence of {n}"

    sinks = set(locs[1] for locs in locations.values())

    grid = utils.RectangularGrid(E.R, E.C,
        lambda r, c: 
            MultiVar('') if (r,c) in sinks else (
                MultiVar('U','R','D','L') if use_all_cells else 
                MultiVar('U','R','D','L','')
            ))

    atom_grids = {}
    for n, (source,sink) in locations.items():
        atoms = utils.RectangularGrid(E.R, E.C, Atom)
        atom_grids[n] = atoms

        # implement path connectivity conditions
        for r in range(E.R):
            for c in range(E.C):
                if r>0:
                    atoms[r][c].prove_if(atoms[r-1][c] & (grid[r-1][c]=='D'))
                if c>0:
                    atoms[r][c].prove_if(atoms[r][c-1] & (grid[r][c-1]=='R'))
                if r<E.R-1: 
                    atoms[r][c].prove_if(atoms[r+1][c] & (grid[r+1][c]=='U'))
                if c<E.C-1: 
                    atoms[r][c].prove_if(atoms[r][c+1] & (grid[r][c+1]=='L'))

        atoms[source].prove_if(True) # prove source for free
        require(atoms[sink]) # require that sink is proven

    # each cell is on (at most) one path
    for r in range(E.R):
        for c in range(E.C):
            if (r,c) not in sinks:
                these_atoms = [atom_grids[n][(r,c)] for n in atom_grids]
                condition = sum_bools(1, these_atoms) & (grid[r][c] != '')
                if not use_all_cells: # allow cell to be unused
                    unused = (grid[r][c] == '')
                    for this_atom in these_atoms:
                        unused &= ~this_atom
                    condition |= unused
                require(condition)

    sols = utils.get_all_grid_solutions(grid)

    # now convert to loop format
    lsols = []
    for sol in sols:
        lsol = {}
        for i in range(E.R):
            for j in range(E.C):
                s = rc_to_grid(i,j)

                u, xu = sol.get(rc_to_grid(i-1,j),'') == 'D', sol.get(s,'') == 'U'
                r, xr = sol.get(rc_to_grid(i,j+1),'') == 'L', sol.get(s,'') == 'R'
                d, xd = sol.get(rc_to_grid(i+1,j),'') == 'U', sol.get(s,'') == 'D'
                l, xl = sol.get(rc_to_grid(i,j-1),'') == 'R', sol.get(s,'') == 'L'

                if (u and xl) or (l and xu): lsol[s] = 'J.png'
                elif (l and xd) or (d and xl): lsol[s] = '7.png'
                elif (r and xu) or (u and xr): lsol[s] = 'L.png'
                elif (d and xr) or (r and xd): lsol[s] = 'r.png'
                elif (l and xr) or (r and xl): lsol[s] = '-.png'
                elif (u and xd) or (d and xu): lsol[s] = '1.png'

                # sources and sinks
                elif u or xu: lsol[s] = 'bottom_end.png'
                elif l or xl: lsol[s] = 'right_end.png'
                elif d or xd: lsol[s] = 'top_end.png'
                elif r or xr: lsol[s] = 'left_end.png'
        lsols.append(lsol)

    return lsols

def decode(solutions):
    return utils.decode(solutions)
