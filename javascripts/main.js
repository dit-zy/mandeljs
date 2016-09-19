const LOG_2 = Math.log(2);
const START_SIZE = 32;
const ITERATIONS_PER_CHUNK = 100;

let state = {
    ctx: null,
    t_ctx: null,

    width: 0,
    height: 0,

    smooth: false,
    colors: 32,
    color_shift: 0,

    data_url: null,
    save_when_done: false,

    compute: {
        i: 0,
        j: 0,
        size: 0,
        max_iters: 0,
        origin_x: 0,
        origin_y: 0,
        width: 0,
        height: 0,
    },
};

let last_animation_request = 0;

function Start(fullscreen) {

    let mc = $('#main_canvas');
    let mc_elem = mc.get(0);

    mc.width(Math.floor(mc.width() / 2) * 2);
    if(fullscreen === true) {
        mc.height(Math.floor(mc.height() / 2) * 2);
    } else {
        // Set the canvas height based on the width
        mc.height(width);
    }
    mc_elem.width = mc.width();
    mc_elem.height = mc.height();

    state.width = mc.width();
    state.height = mc.height();

    let tc = $('#tracer_canvas');
    let tc_elem = tc.get(0);
    tc.width(mc.width());
    tc.height(mc.height());
    tc_elem.width = tc.width();
    tc_elem.height = tc.height();

    tc.click(Zoom);
    tc.contextmenu(Zoom);
    window.onkeypress = KeyPress;

    state.ctx = mc_elem.getContext('2d');
    state.t_ctx = tc_elem.getContext('2d');

    Reset();
    ReDraw();
}

function KeyPress(e) {

    if(e.key === 'r') {
        Reset();
        ReDraw();
    } else if(e.key === 's') {
        Smooth();
    } else if(e.key === 'v') {
        Save();
    } else if(e.key === 'V') {
        SaveWhenDone();
    } else if(e.key === '+') {
        state.compute.max_iters *= 10;
        ReDraw();
    } else if(e.key === '-') {
        state.compute.max_iters /= 10;
        ReDraw();
    } else if(e.key === 'j') {
        state.colors -= 4;
        if(state.colors < 1) state.colors = 1;
        ReDraw();
    } else if(e.key === 'k') {
        if(state.colors <= 1) state.colors = 0;
        state.colors += 4;
        ReDraw();
    } else if(e.key === 'l') {
        ShiftColors(4);
    } else if(e.key === 'h') {
        ShiftColors(-4);
    }
}

function Done() {

    console.log("DONE COMPUTING");

    last_animation_request = 0;

    state.data_url = $('#main_canvas').get(0).toDataURL('image/png');
    if(state.save_when_done) {
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
    if(state.data_url != null) {
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

    state.compute.origin_x = 0;
    state.compute.origin_y = 0;
    state.compute.max_iters = 10000;
    state.compute.height = 4.0
    state.compute.width = state.compute.height * state.width / state.height;

    state.data_url = null;
}

function Smooth() {
    state.smooth = !state.smooth;
    ReDraw();
}

function Zoom(e) {

    let i = e.offsetX;
    let j = e.offsetY;

    let x = state.compute.width*(i/state.width - 0.5);
    let y = state.compute.height*(j/state.height - 0.5);
    state.compute.origin_x += x;
    state.compute.origin_y += y;

    if(!e.shiftKey) {
        if(e.button === 0) {
            state.compute.width /= 2;
            state.compute.height /= 2;
        } else if(e.button === 2) {
            state.compute.width *= 2;
            state.compute.height *= 2;
        }

        let x_prime = state.compute.width*(i/state.width - 0.5);
        let y_prime = state.compute.height*(j/state.height - 0.5);

        state.compute.origin_x -= x_prime;
        state.compute.origin_y -= y_prime;
    }

    ReDraw();

    return false;
}

function ShiftColors(angle) {

    state.color_shift += angle;

    // angle = angle / 360;

    let rendering = state.ctx.getImageData(0, 0, state.width, state.height);
    let img_dat = rendering.data;

    let r,g,b;
    for(let p = 0; p < img_dat.length; p+=4) {
        r = img_dat[p]
        g = img_dat[p+1];
        b = img_dat[p+2];
        // alpha channel (p+3) is ignored

        let hsl = rgbToHsl(r, g, b);
        // let rgb = hslToRgb((hsl[0] + angle) % 1, hsl[1], hsl[2]);
        let rgb = hslToRgb(((hsl[0]*360 + angle) % 360)/360, hsl[1], hsl[2]);

        img_dat[p] = rgb[0];
        img_dat[p+1] = rgb[1];
        img_dat[p+2] = rgb[2];
    }

    state.ctx.putImageData(rendering,0,0);
}

function ReDraw() {

    if(last_animation_request != 0) {
        window.cancelAnimationFrame(last_animation_request);
    }

    // state.img_dat = state.ctx.createImageData(2, 2);

    state.data_url = null;
    state.save_when_done = false;

    state.compute.i = 0;
    state.compute.j = 0;
    state.compute.size = START_SIZE;

    state.ctx.fillStyle = '#000000';
    state.ctx.fillRect(0, 0, state.width, state.height);
    state.t_ctx.clearRect(0, 0, state.width, state.height);

    QueueDraw();
}

function createMatrix(width, height){
    return Array(height).map(column => Array(width));
}

function Draw() {

    let ctx = state.ctx;
    let c = state.compute;

    let start_time = (new Date()).getTime();

    let field_x = state.width / 2;
    let field_y = state.height / 2;

    if(c.i === 0 && c.j === 0) {
        state.t_ctx.fillStyle = 'rgba(255,255,255,255)';
        state.t_ctx.fillRect(field_x + c.size, 0, 1, state.height);
        state.t_ctx.fillRect(field_x - c.size, 0, 1, state.height);
    }

    let current_time = start_time;
    let num_rounds = 0;
    while(((new Date()).getTime() - start_time) < 50) {

        for(let iterator = 0; iterator < ITERATIONS_PER_CHUNK; iterator++) {

            let x1 = field_x + c.i * c.size;
            let x2 = field_x - (c.i+1) * c.size;
            let y = c.j * c.size;

            let shared_condition = c.size === START_SIZE || (0 < (c.j & 0x1));
            if(shared_condition || (c.i & 0x1) === 1) {
                RenderBlock(ctx, c.origin_x, c.origin_y, c.width, c.height, x1, y, state.width, state.height, c.size);
            }
            if(shared_condition || (c.i & 0x1) === 0) {
                RenderBlock(ctx, c.origin_x, c.origin_y, c.width, c.height, x2, y, state.width, state.height, c.size);
            }

            c.j++;
            if(state.height < c.j * c.size) {

                c.j = 0;

                state.t_ctx.fillStyle = 'rgba(0,0,0,0)';
                state.t_ctx.clearRect(field_x + (c.i + 1)*c.size, 0, 1, state.height);
                state.t_ctx.clearRect(field_x - (c.i + 1)*c.size, 0, 1, state.height);

                c.i++;
                if(state.width < c.i * c.size * 2) {

                    if(c.size === 1) {
                        Done();
                        return;
                    }

                    c.size /= 2;
                    c.i = 0;
                }

                state.t_ctx.fillStyle = 'rgba(255,255,255,255)';
                state.t_ctx.fillRect(field_x + (c.i + 1)*c.size, 0, 1, state.height);
                state.t_ctx.fillRect(field_x - (c.i + 1)*c.size, 0, 1, state.height);
            }
        }

        num_rounds++;
    }

    QueueDraw();
}

function ComputeEscape(c, d) {

    // iterate or z as:
    //      Z = Z^2 + C
    // where
    //      Z = a + bi
    //      C = c + di
    let a = 0;
    let b = 0;

    let iterations = 0;
    while((a*a) + (b*b) < 4 && iterations < state.compute.max_iters) {

        let n_a = a*a - b*b + c;
        let n_b = 2*a*b + d;

        a = n_a;
        b = n_b;

        iterations++;
    }

    // If smooth coloring is enabled then iterate a few more times to give a better color result
    if(state.smooth) {
        for(let k = 0; k < 3; k++) {
            let n_a = a*a - b*b + c;
            let n_b = 2*a*b + d;

            a = n_a;
            b = n_b;
        }

        if(iterations < state.compute.max_iters) {
            iterations = iterations + 3 - (Math.log(Math.log(Math.sqrt(a*a + b*b)))/LOG_2);
        }
    }

    return iterations;
}

function RenderBlock(ctx, x, y, width, height, field_x, field_y, field_width, field_height, size) {

    let iterations = ComputeEscape(
            x + width*(field_x/field_width - 0.5),
            y + height*(field_y/field_height - 0.5)
        );

    let color = '#000000';
    if(iterations < state.compute.max_iters) {
        color = 'hsl(' + (180 + state.color_shift + 360*iterations/state.colors) + ', 50%, 50%)';
    }

    ctx.fillStyle = color;
    ctx.fillRect(field_x, field_y, size, size);
    // } else {

    //     let img_dat = state.img_dat;
    //     let img_dat_raw = img_dat.data;
    //     if(cu.size * cu.size * 4 < img_dat_raw.length) {
    //         img_dat = ctx.createImageData(cu.size, cu.size);
    //         state.img_dat = img_dat;
    //         img_dat_raw = img_dat.data;
    //     }

    //     let color = [0, 0, 0];
    //     if(iterations < state.max_iters) {
    //         let h = iterations;
    //         if(state.smooth) {
    //             h = iterations + 3 - (Math.log(Math.log(Math.sqrt(a*a + b*b)))/LOG_2);
    //         }
    //         color = hslToRgb(((180 + h * 360 / state.colors) % 360) / 360, 0.5, 0.5);
    //     }

    //     for(let i = 0; i < img_dat_raw.length; i += 4) {
    //         img_dat_raw[i + 0] = color[0];
    //         img_dat_raw[i + 1] = color[1];
    //         img_dat_raw[i + 2] = color[2];
    //         img_dat_raw[i + 3] = 255;
    //     }
    //     ctx.putImageData(img_dat, cu.i, cu.j);
    // }
}

/**
 * Gotten from: http://stackoverflow.com/a/9493060
 *
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

/**
 * Gotten from: http://stackoverflow.com/a/9493060
 *
 * Converts an RGB color value to HSL. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and l in the set [0, 1].
 *
 * @param   {number}  r       The red color value
 * @param   {number}  g       The green color value
 * @param   {number}  b       The blue color value
 * @return  {Array}           The HSL representation
 */
function rgbToHsl(r, g, b){
    r /= 255, g /= 255, b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if(max == min){
        h = s = 0; // achromatic
    }else{
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max){
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return [h, s, l];
}
