from ..claspy import *
from .solutions import *
from .encoding import *
from .grids import *

class RectangularGridShadingSolver():
    '''
    Solves puzzles which involve shading.
    
    Can be either "main" or "auxiliary".
    '''
    def __init__(self, rows, cols, grid = None, shading_symbols = None):
        '''
        rows = # rows of the puzzle
        cols = # columns of the puzzle
        grid = None if this solver is "main"; the grid to constrain, otherwise
        shading_symbols = a list of symbols which represent shaded cells
        '''
        self.__rows = rows
        self.__cols = cols
        self.__grid = grid or RectangularGrid(rows, cols, BoolVar)
        self.__shading_symbols = shading_symbols.copy() if shading_symbols else [True]
    @property
    def rows(self):
        return self.__rows
    @property
    def cols(self):
        return self.__cols
    @property
    def grid(self):
        return self.__grid
    @property
    def shading_symbols(self):
        return self.__shading_symbols

    def avoid_pattern(self, pattern):
        '''
        Require that no subsquare of the grid matches the given shading pattern.
        Here [pattern] is a 2D rectangular array of truthy values, falsy values, and *;
        * indicates that there is no restriction on that cell.
        '''
        for r in range(self.rows - len(pattern) + 1):
            for c in range(self.cols - len(pattern[0]) + 1):
                cond = True # condition that subsquare with upper-left corner (r,c)
                            # matches the pattern; this needs to be False
                for dr in range(len(pattern)):
                    for dc in range(len(pattern[0])):
                        if pattern[dr][dc] == '*':
                            pass
                        elif pattern[dr][dc]:
                            cond &= var_in(self.grid[r+dr][c+dc], self.__shading_symbols)
                        else:
                            cond &= ~var_in(self.grid[r+dr][c+dc], self.__shading_symbols)
                require(~cond)

    def no_white_2x2(self):
        '''
        Require that no white 2x2 regions exist.
        '''
        self.avoid_pattern([[0,0],[0,0]])
                        
    def no_black_2x2(self):
        '''
        Require that no black 2x2 regions exist.
        '''
        self.avoid_pattern([[1,1],[1,1]])
                        
    def no_adjacent(self):
        '''
        Require that shaded cells are not 90-degree next to each other.
        '''
        self.avoid_pattern([[1,1]])
        self.avoid_pattern([[1],[1]])
                        
    def no_surrounding(self):
        '''
        Require that shaded cells are not adjacent (including diagonals)
        to each other.
        '''
        self.avoid_pattern([[1,1]])
        self.avoid_pattern([[1],[1]])
        self.avoid_pattern([[1,'*'],['*',1]])
        self.avoid_pattern([['*',1],[1,'*']])
                        
    def white_clues(self, clue_cells):
        '''
        Require that clue cells are not shaded.
        '''
        for (r, c) in clue_cells:
            require(~var_in(self.grid[r][c], self.__shading_symbols))
            
    def white_connectivity(self, known_root = None):
        '''
        Require that white cells are connected.
        '''
        connectivity_grid = RectangularGrid(self.rows, self.cols, Atom)
        if known_root:
            connectivity_grid[known_root[0]][known_root[1]].prove_if(True)
            for r in range(self.rows):
                for c in range(self.cols):
                    for (y, x) in connectivity_grid.get_neighbors(r, c):
                        connectivity_grid[r][c].prove_if(
                            ~var_in(self.grid[y][x], self.__shading_symbols) &
                                connectivity_grid[y][x])
                    require(connectivity_grid[r][c] | var_in(self.grid[r][c], self.__shading_symbols))
        else:
            chosen = RectangularGrid(self.rows, self.cols, BoolVar)
            for r in range(self.rows):
                for c in range(self.cols):
                    # This part should happen regardless of neighbors, although it's only relevant for 1x1s.
                    connectivity_grid[r][c].prove_if(chosen[r][c])
                    for (y, x) in connectivity_grid.get_neighbors(r, c):
                        connectivity_grid[r][c].prove_if(
                            ~var_in(self.grid[y][x], self.__shading_symbols) &
                                connectivity_grid[y][x])
                    require(connectivity_grid[r][c] | var_in(self.grid[r][c], self.__shading_symbols))
            require(sum_bools(1, [chosen[r][c] for c in range(self.cols) for r in range(self.rows)]))
        
    def black_clues(self, clue_cells):
        '''
        Require that clue cells are shaded.
        '''
        for (r, c) in clue_cells:
            require(var_in(self.grid[r][c], self.__shading_symbols))

    def black_connectivity(self, known_root = None):
        '''
        Require that black cells are connected.
        '''
        connectivity_grid = RectangularGrid(self.rows, self.cols, Atom)
        if known_root:
            connectivity_grid[known_root[0]][known_root[1]].prove_if(True)
            for r in range(self.rows):
                for c in range(self.cols):
                    for (y, x) in connectivity_grid.get_neighbors(r, c):
                        connectivity_grid[r][c].prove_if(
                            var_in(self.grid[y][x], self.__shading_symbols) &
                                connectivity_grid[y][x])
                    require(connectivity_grid[r][c] | ~var_in(self.grid[r][c], self.__shading_symbols))
        else:
            chosen = RectangularGrid(self.rows, self.cols, BoolVar)
            for r in range(self.rows):
                for c in range(self.cols):
                    for (y, x) in connectivity_grid.get_neighbors(r, c):
                        connectivity_grid[r][c].prove_if(chosen[r][c] |
                            (var_in(self.grid[y][x], self.__shading_symbols) &
                                connectivity_grid[y][x]))
                    require(connectivity_grid[r][c] | ~var_in(self.grid[r][c], self.__shading_symbols))
            require(sum_bools(1, [chosen[r][c] for c in range(self.cols) for r in range(self.rows)]))
        
    def black_edge_connectivity(self):
        '''
        Require that every black cell is connected to an edge.
        '''
        connectivity_grid = RectangularGrid(self.rows, self.cols, Atom)
        for r in range(self.rows):
            for c in range(self.cols):
                if r == 0 or r == self.rows-1 or c == 0 or c == self.cols-1:
                    connectivity_grid[r][c].prove_if(True)
                else:
                    for (y, x) in connectivity_grid.get_neighbors(r, c):
                        connectivity_grid[r][c].prove_if((var_in(self.grid[y][x], self.__shading_symbols) &
                                connectivity_grid[y][x]))
                require(connectivity_grid[r][c] | ~var_in(self.grid[r][c], self.__shading_symbols))
                                
    def solutions(self, shaded_color = 'black', debug_function = None):
        '''
        Return a list of solutions, where each solution is a
        dictionary mapping grid coordinates to background colors.
        '''
        return get_all_grid_solutions(self.grid,
            equality_function = lambda x, y: var_in(x, self.__shading_symbols) == var_in(y, self.__shading_symbols),
            format_function = lambda r, c: shaded_color if self.grid[r][c].value() in self.__shading_symbols else '',
            debug_function = debug_function)
