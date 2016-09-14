let state = {};

function Start() {

    let mc_selector = $('#main_canvas');
    let width = mc_selector.width();
    let mc = mc_selector.get(0);

    // Set the canvas height based on the width
    mc.width = width;
    mc.height = width;

    state.canvasWidth = width;
    state.canvasHeight = width;

    state.ctx = mc.getContext('2d');

    state.ctx.fillStyle = '#000000';
    state.ctx.fillRect(0, 0, state.canvasWidth, state.canvasHeight);

    state.origin_x = 0;
    state.origin_y = 0;
    state.width = 4.0;
    state.height = state.width * state.canvasHeight / state.canvasWidth;
    state.resolution = 8;
    state.first = true;

    // console.log(state);

    mc_selector.click(Zoom);

    window.requestAnimationFrame(Draw);
}

function Draw() {

    let ctx = state.ctx;

    for(let i = 0; i < state.canvasWidth / state.resolution; i++) {

        for(let j = 0; j < state.canvasHeight / state.resolution; j++) {

            // If this is the first rendering, or we're on an odd row or column, draw the point
            if(state.first || 0 < (i & 0x1) || 0 < (j & 0x1)) {

                // iterate or z as:
                //      Z = Z^2 + C
                // where
                //      Z = a + bi
                //      C = c + di
                let a = 0;
                let b = 0;
                let c = state.origin_x - (state.width / 2) + (i * state.resolution * state.width / state.canvasWidth);
                let d = state.origin_y - (state.height / 2) + (j * state.resolution * state.height / state.canvasHeight);

                let iterations = 0;
                while((a*a) + (b*b) < 4 && iterations < 1000) {

                    let n_a = a*a - b*b + c;
                    let n_b = 2*a*b + d;

                    a = n_a;
                    b = n_b;

                    iterations++;
                }

                let color = 0;
                if(iterations < 1000) {
                    color = Math.abs((iterations % 32) - 16) * 256 / 16;
                }
                ctx.fillStyle = 'rgb(' + color + ',' + color + ',' + color + ')';
                ctx.fillRect(i * state.resolution, j * state.resolution, state.resolution, state.resolution);
            }
        }
    }

    state.first = false;

    if(1 < state.resolution) {
        state.resolution /= 2;
        window.requestAnimationFrame(Draw);
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

    state.resolution = 8;
    state.first = true;

    window.requestAnimationFrame(Draw);
}
