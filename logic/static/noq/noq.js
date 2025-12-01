let ELF_TYPES, PUZZLE_TYPES, EXAMPLES, NAV_KEYS, ELVES = {}, IMPS = {};

// load helper scripts, courtesy https://stackoverflow.com/questions/11803215/
const SCRIPTS_TO_LOAD = [
	'noq/elves.js',
	'noq/data.js',
	'noq/imps.js'
];
$.getMultiScripts = function(arr, path) {
    let _arr = $.map(arr, function(x) {return $.getScript((path||"")+x);});
    _arr.push($.Deferred(function(d){$(d.resolve );}));
    return $.when.apply($,_arr); };
$.getMultiScripts(SCRIPTS_TO_LOAD, 'static/').done(function() {
	// process imported scripts here

	ELF_TYPES = elf_types;
	IMP_TYPES = imp_types;
	PUZZLE_TYPES = puzzle_types;
	EXAMPLES = examples;
	NAV_KEYS = nav_keys;

	make_params(PUZZLE_TYPES[pt].params);
	set_unsolved();
});

function get(elt_id) { return document.getElementById(elt_id); }
function is_json(obj) { return obj.constructor == ({}).constructor; }
function get_id_arr(elt) { let arr = elt.id.split(','); return [parseInt(arr[0]), parseInt(arr[1])]; }
function make_elt(type, class_name, parent, innerHTML)
{
	let elt = document.createElement(type);
	if (class_name !== undefined)
		elt.classList.add(class_name);
	if (parent !== undefined)
		parent.appendChild(elt);
	if (innerHTML !== undefined)
		elt.innerHTML = innerHTML;
	return elt;
}

// courtesy https://stackoverflow.com/questions/2057682/
function get_text_width(txt, margin_px=1){
    if (get_text_width.c === undefined){
        get_text_width.c = document.createElement('canvas');
        get_text_width.ctx = get_text_width.c.getContext('2d');
    }
   	var fontspec = '20px ' + 'arial';
    if (get_text_width.ctx.font !== fontspec)
        get_text_width.ctx.font = fontspec;
    return (margin_px + get_text_width.ctx.measureText(txt).width) + 'px';
}

/////////////
// copying //
/////////////
function create_copy_text()
{
	if (ROWS == null || COLS == null)
		return null;

	// build text as an html table using the grid
	let text = "<table><tbody>";
	for (let r=BOUNDS.U+1; r<=BOUNDS.D; r+=2)
	{
		text += "<tr>";
		for (let c=BOUNDS.L+1; c<=BOUNDS.R; c+=2)
			text += ELVES[`${r},${c}`].generate_copy_td().outerHTML;
		text += "</tr>";
	}
	text += "</tbody></table>";
	text += "&nbsp;"; // this is necessary for some reason, to avoid omitting the last cell (?)
	return text;
}

// derived from https://teammatehunt.com/clipboard
function copy_to_clipboard()
{
	// generate text to copy from the state of the grid
	let copy_text = create_copy_text();
	if (copy_text == null) return;

	const copyableElement = get('copy_div');
	copyableElement.innerHTML = copy_text;

    // un-select anything that was currently selected by user
    if (window.getSelection())
      window.getSelection().removeAllRanges();

  	// un-hide element
  	$(copyableElement).show();

    // select the copyable element
    const range = document.createRange();
    range.selectNode(copyableElement);
    if (window.getSelection())
      window.getSelection().addRange(range);

    // exec a "ctrl-C"
    document.execCommand("copy");

  	// re-hide element
  	$(copyableElement).hide();
  	copyableElement.innerHTML = '';

	// un-select things
	if (window.getSelection()) window.getSelection().removeAllRanges();

	get('copy_button').innerHTML = "Copied to clipboard";
    setTimeout(() => get('copy_button').innerHTML = "Copy to clipboard", 2000);
}

///////////
// input //
///////////

const ROW_LIMIT = 30;
const COL_LIMIT = 30;

let active_element = null;
let current_request = null;
let status = 'unsolved';

let ROWS = null;
let COLS = null;
let BOUNDS = null;

let shift_click_corner = null;
let selected_range = null; // null or an array [i_min, i_max, j_min, j_max]

function toggle_border(elt, val) {
	if (val == true) elt.style.backgroundColor = 'black';
	else if (val == false) elt.style.backgroundColor = 'gainsboro';
	else elt.style.backgroundColor = (elt.style.backgroundColor == 'black') ? 'gainsboro' : 'black';

	if (elt.style.backgroundColor == 'black') return true;
	else return false;
}

// retrieves an array of selected cells based on the value of selected_range
function get_selected_cells()
{
	let rg = selected_range;
	if (rg == null)
		return [];

	let arr = [];
	for (let i=rg[0]; i<=rg[1]; i+=2)
		for (let j=rg[2]; j<=rg[3]; j+=2)
			arr.push(get(`shift_click_${i},${j}`));
	return arr;
}	

function update_shift_click_css()
{
	for (let cell of get_selected_cells())
		cell.style.backgroundColor = '';

	if (active_element && shift_click_corner)
	{
		let p1 = get_id_arr(active_element),
			p2 = get_id_arr(shift_click_corner);
		selected_range = [Math.min(p1[0],p2[0]), Math.max(p1[0],p2[0]),
			Math.min(p1[1],p2[1]), Math.max(p1[1],p2[1])];
		for (let cell of get_selected_cells())
			cell.style.backgroundColor = 'lightgreen';
	}
	else
		selected_range = null;
}

function handle_click(event, elt)
{
	if (elt && (!elt.classList || !elt.classList.contains('container_cell'))) // some elt, but not a cell
	{
		handle_click(event, elt.parentNode);
		return;
	}

	if (elt && event.shiftKey) // shift-selected a cell
		shift_click_corner = active_element ? elt : null;
	else // normal-selected a cell or nothing
	{
		shift_click_corner = null;
		set_active(elt);
	}
	update_shift_click_css();
}

$(document).click(function (event) { handle_click(event, event.target); });

$(document).keydown(function (event) {
	if (status == 'solved' || active_element == null) return;
	let shift = event.originalEvent.getModifierState("Shift"),
		control = event.originalEvent.getModifierState("Control");

	if (NAV_KEYS.includes(event.key) && !shift && !control) // move between cells
	{
		let pos = get_id_arr(active_element);
		let new_id = {
			'ArrowUp' : `${pos[0]-2},${pos[1]}`,
			'ArrowRight': `${pos[0]},${pos[1]+2}`,
			'ArrowDown': `${pos[0]+2},${pos[1]}`,
			'ArrowLeft': `${pos[0]},${pos[1]-2}`
		}[event.key];
		let new_elt = get(new_id);
		if (new_elt != undefined && new_elt.getAttribute('hollow') != 'true')
		{
			shift_click_corner = null;
			set_active(new_elt);
			update_shift_click_css();
		}
	}

	else 
	{
		event.preventDefault();
		ELVES[active_element.id].handle_input(event.key,
			{'shift': shift, 'control': control});
	}
});

function set_active(elt)
{
	if (active_element != null)
		active_element.style.outline = 'none';

	if (status == 'solved') return;
	if (active_element != elt)
	{
		try { ELVES[active_element.id].handle_becoming_inactive(); } catch {};
	}

	active_element = elt;
	if (elt != null)
	{
		elt.style.outline = '2pt solid red';
		elt.style.outlineOffset = '-2px';
		try { ELVES[elt.id].handle_becoming_active(); } catch {};
	}
}

function toggle_controls(state) // state = null, true, or false
{
	let cdiv = get('controls_div');

	let val; // whether controls should be on or off
	if (state == true) val = true;
	else if (state == false) val = false;
	else val = (cdiv.innerHTML == '');

	if (val)
	{
		// show controls
		let dict = ELF_TYPES[pt].controls();
		let controls_listings = '';
		let controls_descriptions = '';
		for (let key of Object.keys(dict))
		{
			controls_listings += `<div>${key}:</div>`;
			controls_descriptions += `<div>${dict[key]}</div>`
		}
		cdiv.innerHTML = `
			<div id='controls_listings'>${controls_listings}</div>
			<div id='controls_descriptions'>${controls_descriptions}</div>
			`;
		get('controls_button').innerHTML = 'Hide controls';
	}
	else
	{
		// hide controls
		cdiv.innerHTML = '';
		get('controls_button').innerHTML = 'Show controls';
	}
}

//////////////////////////
// drag-to-draw-borders //
//////////////////////////

let mouse_x = null;
let mouse_y = null;
let mouse_down = false;

let captured_elt = null;
let captured_x = null;
let captured_y = null;
let toggling_mode = null; // true if this mousedown is to toggle on,
						  // false if this mousedown is to toggle off
let containing_cell_id = null;

$(document).mousedown(function (event) {
	mouse_x = event.pageX - window.scrollX;
	mouse_y = event.pageY - window.scrollY;
	mouse_down = true;
});

$(document).mouseup(function (event) {
	mouse_x = null;
	mouse_y = null;
	mouse_down = false;

	captured_elt = null;
	captured_x = null;
	captured_y = null;
	toggling_mode = null;
})

$(document).mousemove(function (event) {
	if (PUZZLE_TYPES[pt].properties.border && mouse_down)
	{
		mouse_x = event.pageX - window.scrollX;
		mouse_y = event.pageY - window.scrollY;

		let key = get_captured_elt_id();
		if (key)
		{
			captured_x = mouse_x;
			captured_y = mouse_y;

			if (toggling_mode === null) // set mode (on or off)
				toggling_mode = ELVES[containing_cell_id].toggle_border(key, null);
			else // use existing mode for this mousedown
				ELVES[containing_cell_id].toggle_border(key, toggling_mode);
		}
	}
})

// using the current values of mouse_x and mouse_y
// and the position of the grid,
// returns a border elt that was captured by the mouse move, or
// null if no elt was close enough to be captured.
// assumptions made:
// - grid cells are square and identical size
// - borders have identical dimensions
// - cell (1,1) and border (0,1) will always exist
let sigma = 0.2; // measure of error tolerance for capturing
function get_captured_elt_id()
{
	let grid = get('grid_div');
	if (!grid.innerHTML)
		return null;

	let tl_rect = get('0,0').getBoundingClientRect();
	let br_rect = get(`${2*ROWS},${2*COLS}`).getBoundingClientRect();

	let grid_l = tl_rect.left,
		grid_r = br_rect.right,
		grid_t = tl_rect.top,
		grid_b = br_rect.bottom;

	let sample_cell = get('1,1');
	let cell_width = sample_cell.getBoundingClientRect().width;

	let sample_hori_border = get('0,1');
	let border_width = sample_hori_border.getBoundingClientRect().height;

	// translate to grid coordinates, where we dictate that 
	// each cell is 1 unit x 1 unit
	let grid_mouse_x = (mouse_x - grid_l) / (cell_width+border_width),
		grid_mouse_y = (mouse_y - grid_t) / (cell_width+border_width);
	let grid_r_relative = (grid_r - grid_l) / (cell_width+border_width),
		grid_b_relative = (grid_b - grid_t) / (cell_width+border_width);

	let frac = n => (n - Math.floor(n));

	if (!(0 < grid_mouse_x && grid_mouse_x < COLS &&
		0 < grid_mouse_y && grid_mouse_y < ROWS))
		return null; // not in grid; nothing can be captured
	// TODO allow this to capture from slightly outside the grid?
	// (adjust to find the right elf; it's a bit annoying but it's super doable)

	containing_cell_id = `${Math.floor(grid_mouse_y)*2+1},${Math.floor(grid_mouse_x)*2+1}`;

	let frac_x = frac(grid_mouse_x),
		frac_y = frac(grid_mouse_y);

	if (frac_x < sigma && sigma < frac_y && frac_y < 1 - sigma) return 'ArrowLeft';
	if (frac_x > 1 - sigma && sigma < frac_y && frac_y < 1 - sigma) return 'ArrowRight';
	if (frac_y < sigma && sigma < frac_x && frac_x < 1 - sigma) return 'ArrowUp';
	if (frac_y > 1 - sigma && sigma < frac_x && frac_x < 1 - sigma) return 'ArrowDown';
}

//////////////////
// display grid //
//////////////////

function reset_button_callback()
{
	spinner_pos = null;
	get('header_div').innerHTML = '';
	get('controls_div').innerHTML = '';
	get('controls_button').innerHTML = 'Show controls';

	set_unsolved();
}

function set_unsolved()
{
	old_status = status;
	status = 'unsolved';

	get('header_div').innerHTML = '';
	get('solve_button').disabled = false;

	let example_buttons = document.getElementsByClassName('example_button');
	for (let i=0; i<example_buttons.length; ++i)
		example_buttons[i].disabled = false;

	if (current_request)
	{
		current_request.abort();
		current_request.stopped = true;
		current_request = null;
	}
	spinner_pos = null;
	let solution_num, solutions, num_solutions;

	for (let elt_id of Object.keys(ELVES))
		ELVES[elt_id].reset_solution();

	if (old_status != 'solved')
	{
		display_grid(get_param_values());
		display_example_buttons();
		toggle_controls(false);
	}
}

function set_solved()
{
	status = 'solved';
	get('solve_button').disabled = true;

	let example_buttons = document.getElementsByClassName('example_button');
	for (let i=0; i<example_buttons.length; ++i)
		example_buttons[i].disabled = true;
}

// gets parameter dict for the current state
function get_param_values() // precondition: status != 'none'
{
	let values = {};
	for (let [key, imp] of Object.entries(IMPS))
		values[key] = imp.encode_input();
	return values;
}

// creates the Imps, set to the given values (and thus the param HTML elements)
// only called once, on initialization
function make_params(param_dict)
{
	IMPS = {};
	get('params_div').innerHTML = '';
	for (let [key, dict] of Object.entries(param_dict))
		IMPS[key] = IMP_TYPES.builder(key, dict);
}

function display_grid(param_dict) // sets the value of grid_div to the default and assigns Elves
{
	if (param_dict === undefined)
		param_dict = get_param_values();

	let border = PUZZLE_TYPES[pt].properties.border;
	let outside = PUZZLE_TYPES[pt].properties.outside;
	let r = param_dict.r || param_dict.n || 9; // 9 = default for Sudoku
	let c = param_dict.c || param_dict.n || 9;

	try
	{
		r = parseInt(r);
		c = parseInt(c);
		if (r <= 0 || c <= 0) return;
		if (r > ROW_LIMIT || c > COL_LIMIT) return;
	}
	catch { return; }
	
	// set global vars
	ROWS = r;
	COLS = c;
	BOUNDS = {
		U: outside.substring(0,1) == '1' ? -2 : 0,
		R: outside.substring(1,2) == '1' ? 2*COLS+2 : 2*COLS,
		D: outside.substring(2,3) == '1' ? 2*ROWS+2 : 2*ROWS,
		L: outside.substring(3,4) == '1' ? -2 : 0,
	}

	let ans = "";
	for (let i=BOUNDS.U; i<=BOUNDS.D; ++i)
	{
		ans += "<div class='grid_row'>";
		for (let j=BOUNDS.L; j<=BOUNDS.R; ++j)
		{
			let parity = 2*((i+2)%2)+((j+2)%2);
			let is_in_grid = (0<=i&&i<=2*r&&0<=j&&j<=2*c);
			let is_an_outside_clue = parity == 3 && !([-1,2*r+1].includes(i)
				&& [-1,2*c+1].includes(j));
			let vis_str = is_in_grid || is_an_outside_clue ? 'visibility: inherit' : 'visibility: hidden';
			let color_str = !is_in_grid && is_an_outside_clue ? `background-color: gray` : '';
			let hollow_str = !is_in_grid && !is_an_outside_clue ? `hollow=true` : '';
			let obj = {0:'dot', 1:'border_horizontal',2:'border_vertical', 3:'cell'}[parity];
			let id_str = `${i},${j}`;

			let display_settings = PUZZLE_TYPES[pt].display;
			let display_str = '';
			if (display_settings && display_settings.no_border_lines && parity != 3)
				display_str = 'visibility: hidden;'; // display=none on border elts

			ans +=
				`<div class="container_${obj} noselect" ${hollow_str} style='${color_str}; ${display_str}' id='${id_str}'>
				<div class="puzzle_${obj} noselect" style='${vis_str}; ${display_str}' id='puzzle_${id_str}'></div>
				<div class="solution_${obj} noselect" style='${vis_str}; ${display_str}' id='solution_${id_str}'></div>
				<div class="shift_click_${obj}" style='${vis_str}; ${display_str}' id='shift_click_${id_str}'></div>
				</div>`;
		}
		ans += "</div>";
	}
	get('grid_div').innerHTML = ans;

	// add elves to all cells (elements with i, j both odd)
	// first reset elves
	ELVES = {};
	for (let i=BOUNDS.U+1; i<=BOUNDS.D-1; i+=2)
		for (let j=BOUNDS.L+1; j<=BOUNDS.R-1; j+=2)
		{
			let id_str = `${i},${j}`;
			let borders = {
					'ArrowUp': get(`${i-1},${j}`),
					'ArrowRight': get(`${i},${j+1}`),
					'ArrowDown': get(`${i+1},${j}`),
					'ArrowLeft': get(`${i},${j-1}`)
				};
			let dots = {
					'q': get(`${i-1},${j-1}`),
					'e': get(`${i-1},${j+1}`),
					'c': get(`${i+1},${j+1}`),
					'z': get(`${i+1},${j-1}`)
				};
			ELVES[id_str] = new ELF_TYPES[pt](elt=get(id_str), borders=borders, i=i, j=j, dots=dots);
		}
}

////////////////////////////////
// EXAMPLES + LOADING PUZZLES //
////////////////////////////////

function load_puzzle(puzzle)
{
	if (!is_json(puzzle))
		puzzle = JSON.parse(puzzle);

	set_unsolved();

	let params = puzzle.param_values;
	for (let [key,imp] of Object.entries(IMPS))
		imp.set_value(params[key]);

	display_grid(params); // now display the new blank grid

	// then load cell contents
	for (let elt_id of Object.keys(puzzle.grid))
	{
		if (ELVES[elt_id])
			ELVES[elt_id].load_example(puzzle.grid[elt_id]);
		else // hack to allow loading of borders, which
			// technically don't have an elf representing them
			// (this is bad, but idk how to do it better)
		{
			set_z_order([get('solution_'+elt_id),get('puzzle_'+elt_id)]);
			get("puzzle_"+elt_id).style.backgroundColor = 'black';
		}
	}
}

function show_example(idx)
{
	if (!EXAMPLES[pt])
		return;

	let example = EXAMPLES[pt][idx];
	if (!example)
		return;

	load_puzzle(example.data);

	if (example.link)
		get('header_div').innerHTML =
			`<a href=${example.link} target='_blank'>(Example source)</a>`;
}

function display_example_buttons()
{
	if (EXAMPLES[pt] == undefined)
		get('examples_div').innerHTML = '';
	else
	{
		let examples_html = '';
		for (let idx of Object.keys(EXAMPLES[pt]))
			examples_html += `<button class='example_button'
				onclick='show_example(${idx})'>Example ${idx}</button>`;
		get('examples_div').innerHTML = examples_html;
	}
}

//////////////////
// solve puzzle //
//////////////////

function parse_input()
{
	// just shove all the data into a JSON object
	let puzzle = {
		param_values: get_param_values(),
		grid: {}
	};

	for (let elf of Object.values(ELVES))
	{
		let encoding = elf.encode_input();
		if (encoding != null)
		{
			if (is_json(encoding))
				for (let key of Object.keys(encoding))
					puzzle.grid[key] = encoding[key];
			else
				puzzle.grid[elf.elt.id] = encoding;
		}
	}

	console.log(JSON.stringify(puzzle)); // this is to encode examples

	puzzle.puzzle_type = pt;
	puzzle.properties = PUZZLE_TYPES[pt].properties;
    return JSON.stringify(puzzle);
}

function solve_puzzle()
{
	still_going = true;
	current_request = new XMLHttpRequest();
	current_request.open("GET",`solver?puzzle_type=${pt}&puzzle=${encodeURI(parse_input())}`);
	current_request.onreadystatechange = function()
	{
		if (this.stopped)
			return;
	  	else if (this.readyState == 4)
	  	{
	  		if (this.status == 200) // solve went through correctly
		  	{
		  		set_solved();
		  		display_solutions(this.responseText);
		  	}
	       	else if (this.status != 200 && this.status != 0) // something went wrong
	    		display_error_message(this.responseText);
	    }
	}
	current_request.send();
    spinner(start=true);
}

let spinner_pos = null;
const spinner_values = ['Solving.&nbsp;&nbsp;', 'Solving..&nbsp;', 'Solving...',];
function spinner(start=false, timeout=500)
{
    if (!start && spinner_pos == null)
    	return;

    if (start)
    	spinner_pos = 0;

    get('header_div').innerHTML = spinner_values[spinner_pos];
    spinner_pos = (spinner_pos + 1) % spinner_values.length;
    setTimeout(spinner, timeout);
}

////////////////////////////////////////
// display solutions or error message //
////////////////////////////////////////

let solution_num, solutions, num_solutions;

function display_solutions(solution_str)
{
	solution_num = 0;
	spinner_pos = null;

	solutions = JSON.parse(solution_str);
	num_solutions = parseInt(solutions.num_solutions);
	if (num_solutions == 0)
	{
	    get('header_div').innerHTML = "No solutions";
		return;
	}

	let ge = num_solutions == 10 ? "&ge;" : "";

	// set up solution cycling panel
	let cycle_solution_html = `Solution <span id='solution_num'></span> of ${ge + num_solutions}`;
	if (num_solutions > 1)
		cycle_solution_html += ` <button onclick='display_next_solution()'>Next solution</button>`;
	get('header_div').innerHTML = cycle_solution_html;

	display_next_solution();
}

function display_next_solution()
{
	solution_num = (solution_num % num_solutions) + 1; // solutions are 1-indexed so this works correctly
	get('solution_num').innerHTML = solution_num;
	
	for (let elf of Object.values(ELVES))
		elf.reset_solution();

	// now put in this solution
	let solution = solutions[solution_num];
	for (let elt_id of Object.keys(solution))
	{
		if (ELVES[elt_id])
			ELVES[elt_id].load_solution(solution[elt_id]);
		else // hack to allow adding black borders which aren't given an elf; TODO make this less hacky
		{
			set_z_order([get('puzzle_'+elt_id), get('solution_'+elt_id)]);
			get('solution_'+elt_id).style.backgroundColor = 'black';
		}
	}
}

function display_error_message(error_str)
{
    spinner_pos = null; // stop the spinner

   	error = JSON.parse(error_str);
    get('header_div').innerHTML = error.message || "An unknown error occurred";
}