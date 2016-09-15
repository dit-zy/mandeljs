const LOG_2 = Math.log(2);
const START_SIZE = 64;
const ITERATIONS_PER_FRAME = 500;

let state = {};
let last_animation_request = 0;

function Start(fullscreen) {

    let mc_selector = $('#main_canvas');
    let width = mc_selector.width();
    let mc = mc_selector.get(0);

    // Set the canvas height based on the width
    if(fullscreen === true) {
        mc.height = mc_selector.height();
    } else {
        mc.height = width;
    }
    mc.width = width;

    state.fullscreen = fullscreen === true
    state.colors = 32;

    Reset();
    state.smooth = false;

    // console.log(state);

    mc_selector.click(Zoom);

    window.onkeypress = function (e) {
        if(e.key === 'r') {
            Reset();
            QueueDraw();
        } else if(e.key === 's') {
            Smooth();
            QueueDraw();
        } else if(e.key === 'v') {
            Save();
        } else if(e.key === 'V') {
            SaveWhenDone();
        } else if(e.key === '+') {
            state.max_iters *= 10;
            ReDraw();
            QueueDraw();
        } else if(e.key === '-') {
            state.max_iters /= 10;
            ReDraw();
            QueueDraw();
        } else if(e.key === 'c') {
            state.colors -= 4;
            if(state.colors < 1) state.colors = 1;
            ReDraw();
            QueueDraw();
        } else if(e.key === 'C') {
            if(state.colors <= 1) state.colors = 0;
            state.colors += 4;
            ReDraw();
            QueueDraw();
        }
    };

    QueueDraw();
}

function Done() {

    console.log("DONE COMPUTING");

    $('#main_canvas').removeClass('computing');
    $('#main_canvas').addClass('computation-complete');

    let data_url = $('#main_canvas').get(0).toDataURL('image/png');
    state.data_url = data_url;
    if('save_when_done' in state && state.save_when_done) {
        state.save_when_done = false;
        Save();
    }
}

function Save() {

    let data_url;
    if('data_url' in state) {
        data_url = state.data_url;
    } else {
        data_url = $('#main_canvas').get(0).toDataURL('image/png');
    }

    let dl_anchor = $('#fractal-download').get(0);
    dl_anchor.setAttribute('href', data_url);
    dl_anchor.click();
}

function SaveWhenDone() {
    if('data_url' in state) {
        Save();
    } else {
        alert("Will prompt you to save the image when it's done computing.");
        state.save_when_done = true;
    }
}

function QueueDraw() {
    last_animation_request = window.requestAnimationFrame(Draw);
}

function Reset() {

    let mc = $('#main_canvas').get(0);

    state.canvasWidth = mc.width;
    state.canvasHeight = mc.height;

    state.ctx = mc.getContext('2d');

    state.ctx.fillStyle = '#000000';
    state.ctx.fillRect(0, 0, state.canvasWidth, state.canvasHeight);

    state.origin_x = 0;
    state.origin_y = 0;
    state.width = 4.0;
    state.height = state.width * state.canvasHeight / state.canvasWidth;

    state.max_iters = 10000;

    ReDraw();
}

function Smooth() {
    state.smooth = !state.smooth;

    ReDraw();
}

function Draw() {

    let ctx = state.ctx;
    let compute_units;
    if('compute_units' in state) {
        compute_units = state.compute_units;
    } else {
        compute_units = [];
        state.compute_units = compute_units;
    }

    if(compute_units.length === 0) {

        for(let j = 0; j < state.canvasHeight; j += START_SIZE) {
            for(let i = 0; i < state.canvasWidth; i += START_SIZE) {
                compute_units.push({
                    'i': i,
                    'j': j,
                    'size': START_SIZE,
                    'draw': true
                });
            }
        }
    }

    for(let i = 0; i < ITERATIONS_PER_FRAME && 0 < compute_units.length; i++) {

        // Get the next compute unit
        let cu = compute_units.shift();

        if(cu.draw) {

            // iterate or z as:
            //      Z = Z^2 + C
            // where
            //      Z = a + bi
            //      C = c + di
            let a = 0;
            let b = 0;
            let c = state.origin_x - (state.width / 2) + (cu.i * state.width / state.canvasWidth);
            let d = state.origin_y - (state.height / 2) + (cu.j * state.height / state.canvasHeight);

            let iterations = 0;
            while((a*a) + (b*b) < 4 && iterations < state.max_iters) {

                let n_a = a*a - b*b + c;
                let n_b = 2*a*b + d;

                a = n_a;
                b = n_b;

                iterations++;
            }

            // If smooth coloring is enabled then iterate a few more times to give a better result
            if(state.smooth) {
                for(let k = 0; k < 3; k++) {
                    let n_a = a*a - b*b + c;
                    let n_b = 2*a*b + d;

                    a = n_a;
                    b = n_b;
                }
            }

            if(2 < cu.size) {
                let color = '#000000';
                if(iterations < state.max_iters) {
                    let h = iterations;
                    if(state.smooth) {
                        h = iterations + 3 - (Math.log(Math.log(Math.sqrt(a*a + b*b)))/LOG_2);
                    }
                    color = 'hsl(' + (180 + h * 360 / state.colors) + ', 50%, 50%)';
                }

                ctx.fillStyle = color;
                ctx.fillRect(cu.i, cu.j, cu.size, cu.size);
            } else {

                let img_dat = state.img_dat;
                let img_dat_raw = img_dat.data;
                if(cu.size * cu.size * 4 < img_dat_raw.length) {
                    img_dat = ctx.createImageData(cu.size, cu.size);
                    state.img_dat = img_dat;
                    img_dat_raw = img_dat.data;
                }

                let color = [0, 0, 0];
                if(iterations < state.max_iters) {
                    let h = iterations;
                    if(state.smooth) {
                        h = iterations + 3 - (Math.log(Math.log(Math.sqrt(a*a + b*b)))/LOG_2);
                    }
                    color = hslToRgb(((180 + h * 360 / state.colors) % 360) / 360, 0.5, 0.5);
                }

                for(let i = 0; i < img_dat_raw.length; i += 4) {
                    img_dat_raw[i + 0] = color[0];
                    img_dat_raw[i + 1] = color[1];
                    img_dat_raw[i + 2] = color[2];
                    img_dat_raw[i + 3] = 255;
                }
                ctx.putImageData(img_dat, cu.i, cu.j);
            }
        }

        if(1 < cu.size) {
            let new_size = cu.size / 2;
            let new_i = cu.i + new_size;
            let new_j = cu.j + new_size;
            compute_units.push({
                'i': cu.i,
                'j': cu.j,
                'size': new_size,
                'draw': false
            },
            {
                'i': cu.i,
                'j': new_j,
                'size': new_size,
                'draw': true
            },
            {
                'i': new_i,
                'j': cu.j,
                'size': new_size,
                'draw': true
            },
            {
                'i': new_i,
                'j': new_j,
                'size': new_size,
                'draw': true
            });
        }
    }

    if(0 < compute_units.length) {
        QueueDraw();
    } else {
        Done();
    }

}

function Zoom(e) {

    let i = e.offsetX;
    let j = e.offsetY;

    state.origin_x = state.origin_x + ((i - (state.canvasWidth / 2)) * state.width / state.canvasWidth);
    state.origin_y = state.origin_y + ((j - (state.canvasHeight / 2)) * state.height / state.canvasHeight);

    if(e.button === 0) {
        state.width /= 2;
        state.height /= 2;
    } else if(e.button === 1) {
        state.width *= 2;
        state.height *= 2;
    }

    ReDraw();

    QueueDraw();
}

function ReDraw() {

    if(last_animation_request != 0) {
        window.cancelAnimationFrame(last_animation_request);
    }

    state.compute_units = [];

    state.img_dat = state.ctx.createImageData(2, 2);

    state.save_when_done = false;
    delete state.data_url;

    $('#main_canvas').removeClass('computation-complete');
    $('#main_canvas').addClass('computing');
}

/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   {number}  h       The hue
 * @param   {number}  s       The saturation
 * @param   {number}  l       The lightness
 * @return  {Array}           The RGB representation
 */
function hslToRgb(h, s, l){
    var r, g, b;

    if(s == 0){
        r = g = b = l; // achromatic
    }else{
        var hue2rgb = function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
