// 旗语与盲文编码实现

const semaphoreBitsToChar = "   W J#  YU T    RQ P   O        ML K   I       H                FE D   C       B               A                                ZX V           S               N                               G                                                               ";
const brailleBitsToChar = " A C BIF E D HJG K M LSP O N RTQ              W  U X V   Z Y     ";
const semaphoreMap = {};
for (let i = 0; i < semaphoreBitsToChar.length; ++i) {
	if (semaphoreBitsToChar[i].trim()) semaphoreMap[i] = semaphoreBitsToChar[i];
}

const brailleMap = {};
for (let i = 0; i < brailleBitsToChar.length; ++i) {
	if (brailleBitsToChar[i].trim()) brailleMap[i] = brailleBitsToChar[i];
}

// 字符到编码的映射
const charToSemaphore = {};
const charToBraille = {};

for (const [key, value] of Object.entries(semaphoreMap)) {
	charToSemaphore[value] = parseInt(key);
}

for (const [key, value] of Object.entries(brailleMap)) {
	charToBraille[value] = parseInt(key);
}

let currentBitsArray = [0];
let activeCanvasIndex = 0;
function setupQiyuCanvas() {
	currentBitsArray = [0];
	activeCanvasIndex = 0;
	updateCanvasDisplay();
}

function updateCanvasDisplay() {
	const container = document.getElementById('qiyuCanvasContainer');
	const type = document.getElementById('qiyuType').value;
	container.innerHTML = '';
	for (let i = 0; i < currentBitsArray.length; i++) {
		const canvasWrapper = document.createElement('div');
		canvasWrapper.className = 'canvas-wrapper';
		canvasWrapper.style.position = 'relative';
		canvasWrapper.style.margin = '5px';
		const canvas = document.createElement('canvas');
		canvas.width = type === 'semaphore' ? 120 : 90;
		canvas.height = 120;
		canvas.id = `${type}Canvas_${i}`;
		canvas.dataset.index = i;
		if (i === activeCanvasIndex) {
			canvas.style.opacity = '1';
			canvas.style.border = '2px solid #2ecc71';
		} else if (i < activeCanvasIndex) {
			canvas.style.opacity = '0.8';
			canvas.style.border = '1px solid #3498db';
		} else {
			canvas.style.opacity = '0.6';
			canvas.style.border = '1px dashed #3498db';
		}
		canvas.style.borderRadius = '8px';
		
		if (type === 'semaphore') {
			drawSemaphoreBackground(canvas);
			if (currentBitsArray[i] > 0) {
				drawSemaphoreLines(canvas, currentBitsArray[i]);
			}
		} else {
			drawBrailleBackground(canvas);
			if (currentBitsArray[i] > 0) {
				drawBrailleDots(canvas, currentBitsArray[i]);
			}
		}
		
		canvas.addEventListener('click', function(e) {
			const idx = parseInt(this.dataset.index);
			activeCanvasIndex = idx;
			const rect = canvas.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const y = e.clientY - rect.top;
			if (type === 'semaphore') {
				handleSemaphoreClick(canvas, x, y, idx);
			} else {
				handleBrailleClick(canvas, x, y, idx);
			}
			if (idx === currentBitsArray.length - 1) {
				currentBitsArray.push(0);
				updateCanvasDisplay(); 
			}
			updateCanvasStyles();
		});
		const label = document.createElement('div');
		label.textContent = i + 1;
		label.style.position = 'absolute';
		label.style.bottom = '0';
		label.style.left = '0';
		label.style.backgroundColor = 'rgba(0,0,0,0.5)';
		label.style.color = 'white';
		label.style.padding = '2px 6px';
		label.style.borderBottomLeftRadius = '7px';
		label.style.fontSize = '10px';
		if (currentBitsArray[i] > 0) {
			const mapToUse = type === 'semaphore' ? semaphoreMap : brailleMap;
			const char = mapToUse[currentBitsArray[i]];
			if (char) {
				const charLabel = document.createElement('div');
				charLabel.textContent = char;
				charLabel.style.position = 'absolute';
				charLabel.style.top = '0';
				charLabel.style.right = '0';
				charLabel.style.backgroundColor = 'rgba(0,0,0,0.5)';
				charLabel.style.color = 'white';
				charLabel.style.padding = '2px 6px';
				charLabel.style.borderTopRightRadius = '7px';
				charLabel.style.fontSize = '10px';
				canvasWrapper.appendChild(charLabel);
			}
		}
		canvasWrapper.appendChild(canvas);
		canvasWrapper.appendChild(label);
		container.appendChild(canvasWrapper);
	}
}

function updateCanvasStyles() {
	const container = document.getElementById('qiyuCanvasContainer');
	const canvases = container.querySelectorAll('canvas');
	canvases.forEach(canvas => {
		const idx = parseInt(canvas.dataset.index);
		if (idx === activeCanvasIndex) {
			canvas.style.opacity = '1';
			canvas.style.border = '2px solid #2ecc71';
		} else if (idx < activeCanvasIndex) {
			canvas.style.opacity = '0.8';
			canvas.style.border = '1px solid #3498db';
		} else {
			canvas.style.opacity = '0.6';
			canvas.style.border = '1px dashed #3498db';
		}
	});
}

function handleSemaphoreClick(canvas, x, y, canvasIndex) {
	const dx = x - 50 * 120 / 100;
	const dy = y - 50 * 120 / 100;
	const r = dx * dx + dy * dy;
	if (r < 4 || r > 120 * 120 / 2) {return;}
	let ang = Math.atan2(-dy, dx) * 4 / Math.PI;
	let angr = Math.round(ang);
	if (angr < 0) {angr += 8;}
	const newBit = 1 << angr;
	if (currentBitsArray[canvasIndex] & newBit) {
		currentBitsArray[canvasIndex] &= ~newBit; 
	} else {
		const bitCount = countBits(currentBitsArray[canvasIndex]);
		if (bitCount >= 2) {currentBitsArray[canvasIndex] = newBit} 
		else {currentBitsArray[canvasIndex] |= newBit; }}
	drawSemaphoreBackground(canvas);
	drawSemaphoreLines(canvas, currentBitsArray[canvasIndex]);
	updateQiyuResult(canvasIndex);
}

// 处理盲文画布点击
function handleBrailleClick(canvas, x, y, canvasIndex) {
	const dx = x - 90 / 2;
	const dy = y;
	let angr = dx < 0 ? 0 : 1;
	if (dy < 120 / 3) {angr += 0;
	} else if (dy < 2 * 120 / 3) {angr += 2;
	} else {angr += 4;}
	currentBitsArray[canvasIndex] ^= (1 << angr);
	drawBrailleBackground(canvas);
	drawBrailleDots(canvas, currentBitsArray[canvasIndex]);
	updateQiyuResult(canvasIndex);
}

function updateQiyuResult(canvasIndex) {
	const type = document.getElementById('qiyuType').value;
	const map = type === 'semaphore' ? semaphoreMap : brailleMap;
	const bits = currentBitsArray[canvasIndex];
	const char = map[bits] || ' ';
	updateInputFromCanvases();
	const result = document.getElementById('qiyuResult');
	result.textContent = `画布 ${canvasIndex + 1} 当前字符: ${char}`;
}

function updateInputFromCanvases() {
	const type = document.getElementById('qiyuType').value;
	const map = type === 'semaphore' ? semaphoreMap : brailleMap;
	let text = '';
	for (let i = 0; i < currentBitsArray.length; i++) {
		const bits = currentBitsArray[i];
		if (bits > 0 && map[bits]) {text += map[bits];}
	}
	document.getElementById('qiyuInput').value = text;
}

function updateCanvasesFromInput() {
	const type = document.getElementById('qiyuType').value;
	const text = document.getElementById('qiyuInput').value.toUpperCase();
	const map = type === 'semaphore' ? charToSemaphore : charToBraille;
	currentBitsArray = [];
	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		if (map[char]) {currentBitsArray.push(map[char]);}
	}
	if (currentBitsArray.length === 0) {currentBitsArray = [0];}
	currentBitsArray.push(0);
	activeCanvasIndex = currentBitsArray.length - 2;
	if (activeCanvasIndex < 0) activeCanvasIndex = 0;
	updateCanvasDisplay();
}

document.getElementById('qiyuClear').addEventListener('click', function() {
	document.getElementById('qiyuInput').value = '';
	setupQiyuCanvas(); 
	document.getElementById('qiyuResult').textContent = '';
});

document.getElementById('qiyuInput').addEventListener('input', function() {
	updateCanvasesFromInput();
	document.getElementById('qiyuResult').textContent = ''; 
});

document.getElementById('qiyuType').addEventListener('change', function() {
	setupQiyuCanvas(); 
});

function drawSemaphoreBackground(canvas) {
	const ctx = canvas.getContext('2d');
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = '#0f1b33';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.beginPath();
	ctx.strokeStyle = 'rgba(52, 152, 219, 0.15)';
	ctx.lineWidth = 0.5;
	for(let i = 0; i < canvas.height; i += 10) {
		ctx.moveTo(0, i);
		ctx.lineTo(canvas.width, i);
	}
	for(let i = 0; i < canvas.width; i += 10) {
		ctx.moveTo(i, 0);
		ctx.lineTo(i, canvas.height);
	}
	ctx.stroke();
	const pts = [[90, 50], [78, 22], [50, 10], [22, 22], [10, 50], [22, 78], [50, 90], [78, 78]];
	ctx.beginPath();
	for (const coord of pts) {
		ctx.moveTo(50 * 120 / 100, 50 * 120 / 100);
		ctx.lineTo(coord[0] * 120 / 100, coord[1] * 120 / 100);
		ctx.strokeStyle = '#1e88e5'; 
		ctx.lineWidth = 1.5;
	}
	ctx.stroke();
	ctx.beginPath();
	ctx.arc(50 * 120 / 100, 50 * 120 / 100, 4, 0, 2 * Math.PI);
	ctx.fillStyle = '#2ecc71'; 
	ctx.fill();
	ctx.beginPath();
	ctx.arc(50 * 120 / 100, 50 * 120 / 100, 6, 0, 2 * Math.PI);
	ctx.strokeStyle = '#2ecc71';
	ctx.lineWidth = 1;
	ctx.stroke();
}

function drawSemaphoreLines(canvas, bits) {
	const ctx = canvas.getContext('2d');
	const pts = [[90, 50], [78, 22], [50, 10], [22, 22], [10, 50], [22, 78], [50, 90], [78, 78]];
	for (let i = 0; i < 8; i++) {
		if (bits & (1 << i)) {
			ctx.beginPath();
			ctx.moveTo(50 * 120 / 100, 50 * 120 / 100);
			ctx.lineTo(pts[i][0] * 120 / 100, pts[i][1] * 120 / 100);
			ctx.strokeStyle = "rgba(46, 204, 113, 0.4)"; 
			ctx.lineWidth = 8;
			ctx.stroke();
		}
	}
	ctx.beginPath();
	for (let i = 0; i < 8; i++) {
		if (bits & (1 << i)) {
			ctx.moveTo(50 * 120 / 100, 50 * 120 / 100);
			ctx.lineTo(pts[i][0] * 120 / 100, pts[i][1] * 120 / 100);
		}
	}
	const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
	gradient.addColorStop(0, '#00bcd4'); 
	gradient.addColorStop(1, '#2ecc71'); 
	ctx.strokeStyle = gradient;
	ctx.lineWidth = 3;
	ctx.stroke();
	for (let i = 0; i < 8; i++) {
		if (bits & (1 << i)) {
			ctx.beginPath();
			ctx.arc(pts[i][0] * 120 / 100, pts[i][1] * 120 / 100, 3, 0, 2 * Math.PI);
			ctx.fillStyle = '#2ecc71';
			ctx.fill();
		}
	}
}

function drawBrailleBackground(canvas) {
	const ctx = canvas.getContext('2d');
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = '#0f1b33';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.beginPath();
	ctx.strokeStyle = 'rgba(52, 152, 219, 0.15)';
	ctx.lineWidth = 0.5;
	for(let i = 0; i < canvas.height; i += 10) {
		ctx.moveTo(0, i);
		ctx.lineTo(canvas.width, i);
	}
	for(let i = 0; i < canvas.width; i += 10) {
		ctx.moveTo(i, 0);
		ctx.lineTo(i, canvas.height);
	}
	ctx.stroke();
	const xOffset = 24;
	const pts = [[xOffset, 15], [100 - xOffset, 15], [xOffset, 50], [100 - xOffset, 50], [xOffset, 85], [100 - xOffset, 85]];
	for (let i = 0; i < pts.length; ++i) {
		ctx.beginPath();
		ctx.arc(pts[i][0] / 100 * canvas.width, pts[i][1] * 120 / 100, 7 * 120 / 100, 0, 2 * Math.PI, false);
		ctx.lineWidth = 1.5;
		ctx.strokeStyle = '#3498db'; 
		ctx.stroke();
		ctx.fillStyle = 'rgba(52, 152, 219, 0.15)'; 
		ctx.fill();
	}
}

function drawBrailleDots(canvas, bits) {
	const ctx = canvas.getContext('2d');
	const xOffset = 24;
	const pts = [[xOffset, 15], [100 - xOffset, 15], [xOffset, 50], [100 - xOffset, 50], [xOffset, 85], [100 - xOffset, 85]];
	for (let i = 0; i < pts.length; ++i) {
		ctx.beginPath();
		ctx.arc(pts[i][0] / 100 * canvas.width, pts[i][1] * 120 / 100, 7 * 120 / 100, 0, 2 * Math.PI, false);
		ctx.lineWidth = 1.5;
		ctx.strokeStyle = bits & (1 << i) ? '#2ecc71' : '#3498db';
		ctx.stroke();
	}
	for (let i = 0; i < pts.length; ++i) {
		if (bits & (1 << i)) {
			ctx.beginPath();
			ctx.arc(pts[i][0] / 100 * canvas.width, pts[i][1] * 120 / 100, 9 * 120 / 100, 0, 2 * Math.PI, false);
			ctx.fillStyle = 'rgba(46, 204, 113, 0.2)';
			ctx.fill();
			ctx.beginPath();
			ctx.arc(pts[i][0] / 100 * canvas.width, pts[i][1] * 120 / 100, 7 * 120 / 100, 0, 2 * Math.PI, false);
			const dotGradient = ctx.createRadialGradient(
				pts[i][0] / 100 * canvas.width, pts[i][1] * 120 / 100, 0,
				pts[i][0] / 100 * canvas.width, pts[i][1] * 120 / 100, 7 * 120 / 100
			);
			dotGradient.addColorStop(0, '#2ecc71'); 
			dotGradient.addColorStop(1, '#00bcd4'); 
			ctx.fillStyle = dotGradient;
			ctx.fill();
			ctx.beginPath();
			ctx.arc(
				pts[i][0] / 100 * canvas.width - 2, 
				pts[i][1] * 120 / 100 - 2, 
				2, 0, 2 * Math.PI, false
			);
			ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
			ctx.fill();
		}
	}
}

function countBits(n) {
	let count = 0;
	while (n) {
		count += n & 1;
		n >>= 1;
	}
	return count;
}