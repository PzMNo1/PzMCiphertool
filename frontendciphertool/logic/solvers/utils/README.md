# Table of Contents
1. [Backend Only](#backend-only)
    1. [Important Concepts](#important-concepts)
    2. [Overview of How to Use](#overview-of-how-to-use)
    3. [Overview of Each File](#overview-of-each-file)
2. [Backend-Frontend Communication](#backend-frontend-communication)
    1. [Frontend to Backend](#frontend-to-backend)
    2. [Backend Preprocessing](#backend-preprocessing)
    3. [Backend to Frontend](#backend-to-frontend)

# Backend Only
## Important Concepts
- **Grid**: Basically a list of lists, where each inner list represents a row of a puzzle. Grid elements are all of the same type, and are:
  - *BoolVar*: To represent shading. True values correspond to dark cells.
  - *IntVar*: To represent numbers. Can be used to solve Fillomino and Skyscrapers, or to represent things like region IDs.
  - *MultiVar*: To represent anything that isn't a True / False. Usually loop shapes.
- **Solver**: 
  - An object that has:
    - a grid, accessed using `solver.grid`
    - methods that lets you put constraints on its grid
    - a `solver.solutions()` method which returns a list of solutions
  - Solvers can be:
    - *main*: the solution to their grid is the one that is generally thought of as "solving the puzzle"
    - *auxiliary*: they exist to place constraints on the main solver's grid.
  - Main solvers are initialized with the puzzle dimensions (# rows, # cols).
  - Auxiliary solvers are initialized with the puzzle dimensions *and* the grid of the main solver (`main_solver.grid`).
    - This is important because the auxiliary solver needs to have access to the main solver's grid in order to place constraints on it.

## Overview of How to Use
Let's go over a few examples so we can see how this works.
- Nurikabe Solver
```
shading_solver = utils.RectangularGridShadingSolver(rows, cols)
shading_solver.black_connectivity()
shading_solver.no_black_2x2()

region_solver = utils.RectangularGridRegionSolver(rows, cols, shading_solver.grid,
                    max_num_regions = len(clue_cell_id), region_symbol_sets = [[False,]])
region_solver.region_roots(clue_cell_id)
region_solver.region_size(max_clue, clue_cells, clue_region_bijection = True)
```
Nurikabe is "fundamentally" a shading puzzle (the answer is given by which cells are shaded). Thus, we initialize a shading solver with the dimensions that we want, and use that as our main solver. We then require that black cells are connected, and that there's no black 2x2. 

The next thing that we do is constrain the regions. This is an auxiliary solver, so we pass `shading_solver.grid` to it. There's some additional information that the constructor also needs, but we'll talk about those more in detail later on. This region solver is then used to constrain the islands of the Nurikabe puzzle. 

- Yajilin Solver
```

loop_solver = utils.RectangularGridLoopSolver(rows, cols, shading = True)
shading_solver = utils.RectangularGridShadingSolver(
                    rows, cols, grid = loop_solver.grid, shading_symbols = ['.'])
loop_solver.loop(clue_cells, allow_blanks = False)
shading_solver.no_adjacent()
```
Yajilin is "fundamentally" a loop puzzle, so its main solver is a loop solver. It also has some shading rules, so the next thing that we do is make a shading solver and pass `loop_solver.grid` into its constructor. We can then use these to constrain the loop and the shaded cells.

The rules about how many shaded cells are "seen" by each of the arrow clues must be written separately. We place constraints on `loop_solver.grid` using Claspy as normal.

## Overview of Each File
- **borders.py**: 
  - `Direction`: an Enum with values `LEFT`, `TOP`, `RIGHT`, `BOTTOM`; this is part of the representation of edges.
  - each *edge* has several possible representations:
    - *edge_id*: a tuple `(r, c, d)`, where `r`, `c` are row, col coordinates and d is a `Direction`. `d` is one of `LEFT`, `TOP` if possible; it only takes on the value `RIGHT` or `BOTTOM` if the edge that needs to be represented is on the bottom row or rightmost column.
    - *border_coord*: a coordinate which follows the notation system described below:
        ```
        the "border coordinates" are ordered left-to-right, top-to-bottom,
        and also account for the gaps between edges
        (despite the fact that these are not true borders)

          --0,1-- --0,3-- --0,5--
         |       |       |       |
        1,0     1,2     1,4     1,6
         |       |       |       |
         --2,1-- --2,3-- --2,5--
        ```
    - a non-canonical representation: a tuple `(r, c, d)`, where `r`, `c` are row, col coordinates and d is a `Direction`. `d` takes on whatever value is convenient, so this tuple is not necessarily equal to the *edge_id*.
  - the methods:
    - `get_edge_id_from_border_coord`: converts from *border_coord* to *edge_id*
    - `get_border_coord_from_edge_id`: converts from *edge_id* to *border_coord*
    - `get_edge_id`: generates the *edge_id* from a non-canonical tuple representation
  - *RectangularGridBorderSolver*: a solver that solves puzzles which involve the act of specifically drawing borders (which isn't quite the same thing as dividing the grid into regions). Example puzzle types that it is good for would include Slitherlink and Sheep-Wolf, and (I think I can get this to work with some more effort?) Corral.
    - `loop(self, min_num_loops = 1, max_num_loops = 1)`: constrains the puzzle to make an appropriate number of valid loops
- **loops.py**: 
  - defines a bunch of loop-puzzle patterns, by type (for example, `LEFT_CONNECTING = ['J', '7', '-']`)
  - *RectangularGridLoopSolver*: a solver that solves puzzles which involve drawing loops through cells. This solver is always *main* (never *auxiliary*).
      - constructor has parameters `rows, cols, directed = False, shading = False`.
          - We need to specify whether the loop has direction and whether shading is possible because these impact the values that each cell of the grid can take on.
      - `loop(self, clue_cells, includes_clues = False, allow_blanks = True, transparent = False, min_num_loops = 1, max_num_loops = 1)`
          - `clue_cells` contains the `(r, c)` coordinates of each of the clues
          - `includes_clues` is true iff the loop goes through the clues
          - `allow_blanks` is true iff cells are allowed to be empty (non-clue, non-shaded, non-loop)
          - `transparent` is true iff clue cells are allowed to be shaded
          - `min_num_loops` and `max_num_loops` determine the number of permissible loops
 - **shading.py**:
     - *RectangularGridShadingSolver*: a solver for shading cells! This solver can be either *main* or *auxiliary*.
      - constructor has parameters `rows, cols, grid = None, shading_symbols = None`
        - if `grid` is not `None`, this solver is acting as an auxiliary solver
        - `shading_symbols` is a list of symbols which represent shading
          - for shading puzzles, this is `[True]` by convention
          - for loop puzzles, this is `['.']` by convention
          - but you can specify other things! For example, making `[4, 5]` would work well for a 5x5 Doppelblock (the "underlying representation" is a Latin square)
- **shapes.py**:
  - represents a "shape" as a sorted tuple of tuples, where the first tuple is `(0, 0)` and each subsequent tuple is an offset from the first cell.
  - Right now, this is kind of a stub file because shapes are hard and I haven't really decided what to do yet.
- **constants.py**
  - defines `MAX_SOLUTIONS_TO_FIND`
- **grids.py**
  - `is_valid_coord(rows, cols, r, c)`: returns `True` if `(r, c)` is a valid coordinate given a `rows` x `cols` grid
  - `get_neighbors(rows, cols, r, c)`: returns the 90-degree adjacent neighbors of `(r, c)` in a `rows` x `cols` grid
  - `get_surroundings(rows, cols, r, c)`: returns all (including diagonal) neighbors of `(r, c)` in a `rows` x `cols` grid
  - *RectangularGrid*: is basically a list of lists, where each inner list represents a row of a puzzle; grid elements are all of the same type. Has versions of the above methods implemented as instance methods (eliminates the first 2 parameters and uses `self.rows` and `self.cols` instead)
 - **regions.py**
    - `full_bfs(rows, cols, borders, clues = None)`:
        - `borders` is a list where each element is a *border_coord*
        - `clues` is a collection of clues
            - if it's not `None`, the return value of `full_bfs` is a mapping from `(r, c)` coordinates of clues to sets of the coordinates of all cells in that region / connected component.
            - if it is `None`, the return value of `full_bfs` is a set of sets, where each inner set contains the coordinates of all cells in that region / connected component.
    -  *RectangularGridRegionSolver*: a solver that either applies constraints to puzzles where regions are part of the input, or solves a puzzle by finding regions. This solver is always *auxiliary*.
        - constructor takes parameters `rows, cols, grid, given_regions = None, max_num_regions = None, region_symbol_sets = None`
            - `grid` is mandatory, since a region solver is always *auxiliary*!
            - `given_regions` is an output from the `full_bfs` method. It is to be used when the regions are part of the input of the puzzle, and it is expected that when `given_regions` is not `None`, the parameters `max_num_regions` and `region_symbol_sets` will both be `None`.
            - `max_num_regions`: the maximum number of regions that can exist in the puzzle. It is to be used when regions are unknown and part of the puzzle solution. It is expected that `given_regions` is `None` and that `region_symbol_sets` is not `None`.
            - `region_symbol_sets`: a collection of collections, where each internal collection consists of all of the symbols which together make a region. For example, if you wanted to use the region solver to find horizontal bars in an Amibo puzzle, this parameter might look something like `[['+', '-'], [' ', '|']`, because those two first symbols are next to each other iff their cells are part of the same horizontal bar "region", and the other symbols are "non-horizontal-bar" and thus together form a "non-interesting" region which should not be broken into subparts. This parameter is to be used when regions are unknown and part of the puzzle solution. It is expected that `given_regions` is `None` and that `max_num_regions` is not `None`.
 - **numbers.py**:
     - *RectangularGridNumbersSolver*: solves puzzles whose goal is to write a number in every cell. This solver is always *main*, never *auxiliary*.
         -  `regions(self, regions)`: constrains the values in each of the given regions (collections of `(r, c)` coordinates) to be distinct
         - `rows_and_cols(self)`: constrains the values in each row to be distinct, and the values in each column to be distinct

# Backend-Frontend Communication
## Frontend to Backend
The object which is handed to the backend is a JSON object with the following attributes:
- `clues`: mandatory. A representation of the clues in the puzzle (including borders / outside clues), where each cell's value is separated from the others in its row using commas and each row is separated from the other using newlines.
- `param_values`: optional. A list of parameter values for the puzzle.
- `border_coords`: optional. A list of *border_coords* that define the regions that are part of the puzzle input.

## Backend Preprocessing
The JSON object gets handed to the `encode` method in `encoding.py`. This method has the parameters `string, clue_encoder = default_clue_encoder, has_params = False, has_borders = False, outside_clues = ClueLocations.NONE)`. 
 - `clue_encoder` is a function which each individual puzzle can specify. It defaults to accepting numbers (outputting them as ints) and `?` characters.
 - `has_params` is True iff the puzzle has parameters (e.g. Star Battle specifies a # of stars per region / row / col).
 - `has_borders` is True iff the puzzle input has borders which define regions.
 - `outside_clues` is a `ClueLocation` (an enum value) which is one of `NONE`, `ALL`, or `TOP_AND_LEFT`.
 
 The `encode` method returns puzzle information in the order: `rows, cols, clue_cells, params, edge_ids, top_clues, right_clues, bottom_clues, left_clues`. It omits any values which do not apply (for example, if a puzzle has no params, has borders, and has no outside clues, the returned values will be `rows, cols, clue_cells, edge_ids` in that order).
 
 ## Backend to Frontend
 The `decode` method returns a JSON object with a count of solutions and a list of solutions. Each solution will generally be a list, but its contents vary by puzzle type.
 - For shading puzzles: `(r, c)` coordinates, **1-indexed**, of the shaded cells
 - For loop puzzles: 
     - characters in the set `rJ7L-1.` and space, if the puzzle is non-directional
     - characters in the set `←→↑↓↰↱↲↳↴⬏⬐⬑.` and space, if the puzzle is directional 
 - For number puzzles: a list of numbers
 - For border-drawing puzzles: a list of *border_coords* for the shaded borders
