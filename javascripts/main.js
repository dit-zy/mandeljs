const LOG_2 = Math.log(2);

let state = {};

function Start() {

    let mc_selector = $('#main_canvas');
    let width = mc_selector.width();
    let mc = mc_selector.get(0);

    // Set the canvas height based on the width
    mc.width = width;
    mc.height = width;

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
        }
    };

    QueueDraw();
}

function QueueDraw() {
    window.requestAnimationFrame(Draw);
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
    state.resolution = 8;
    state.first = true;
}

function Smooth() {
    state.smooth = !state.smooth;
    state.resolution = 8;
    state.first = true;
}

function Draw() {

    // let start = (new Date()).getTime();

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

                // If smooth coloring is enabled then iterate a few more times to give a better result
                if(state.smooth) {
                    for(let k = 0; k < 3; k++) {
                        let n_a = a*a - b*b + c;
                        let n_b = 2*a*b + d;

                        a = n_a;
                        b = n_b;
                    }
                }

                let color = '#000000';
                if(iterations < 1000) {
                    let h = iterations;
                    if(state.smooth) {
                        h = iterations + 3 - (Math.log(Math.log(Math.sqrt(a*a + b*b)))/LOG_2);
                    }
                    color = 'hsl(' + (180 + h * 360 / 32) + ', 50%, 50%)';
                }
                ctx.fillStyle = color;
                ctx.fillRect(i * state.resolution, j * state.resolution, state.resolution, state.resolution);
            }
        }
    }

    // let time = ((new Date()).getTime() - start) / 1000;
    // let pixels = state.canvasWidth * state.canvasHeight / Math.pow(state.resolution, 2)
    // console.log({
    //     'time': time,
    //     'pixels': pixels,
    //     'per_second': pixels / time
    // });

    state.first = false;

    if(1 < state.resolution) {
        state.resolution /= 2;
        QueueDraw();
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

    QueueDraw();
}
