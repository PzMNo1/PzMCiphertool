from ..claspy import *
from .grids import *
from .solutions import *
from .encoding import *

def factor_pairs(n):
    '''
    n -> [all pairs (a,b) such that a*b=n]
    '''
    pairs = []
    for i in range(1, n+1):
        if n % i == 0:
            pairs.append((i, n//i))
    return pairs

class RectangularGridNumbersSolver:
    '''
    Solves puzzles which require writing a number in each cell.
    '''
    def __init__(self, rows, cols, min_value, max_value):
        '''
        rows = # rows
        cols = # columns
        min_value = the minimum permissible integer value
        max_value = the maximum permissible integer value
        '''
        self.__rows = rows
        self.__cols = cols
        self.__grid = RectangularGrid(rows, cols, lambda : IntVar(min_value, max_value))
    @property
    def rows(self):
        return self.__rows
    @property
    def cols(self):
        return self.__cols
    @property
    def grid(self):
        return self.__grid
    def regions(self, regions):
        '''
        Given a collection of regions, where each region consists of
        (r, c) coordinates,
        
        Require that the cells in that region are all distinct.
        '''
        for region in regions:
            cells_in_region = [self.grid[r][c] for (r, c) in region]
            require_all_diff(cells_in_region)
    def rows_and_cols(self):
        '''
        Require that the cells in every row are distinct,
        and that the cells in every column are distinct.
        '''
        for r in range(self.rows):
            require_all_diff([self.grid[r][c] for c in range(self.cols)])
        for c in range(self.cols):
            require_all_diff([self.grid[r][c] for r in range(self.rows)])
    def solutions(self):
        '''
        Get a list of solutions, where each solution is a list of cell
        values (which are numbers), read in a left-to-right, top-to-bottom
        ordering.
        '''
        return get_all_grid_solutions(self.grid)
