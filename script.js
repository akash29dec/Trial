// Add audio element
const audio = new Audio('audio.mp3');
audio.loop = true; // Loop music
let audioAllowed = false; // To track if audio is allowed to play

// Create a romantic-style prompt for user interaction
const promptDiv = document.createElement('div');
promptDiv.innerHTML = `
  <div class="romantic-container">
    <div class="romantic-message">
      <p>Click anywhere to reveal the surprise 🎁</p>
    </div>
  </div>`;
promptDiv.style.position = 'fixed';
promptDiv.style.top = '0';
promptDiv.style.left = '0';
promptDiv.style.width = '100%';
promptDiv.style.height = '100%';
promptDiv.style.display = 'flex';
promptDiv.style.justifyContent = 'center';
promptDiv.style.alignItems = 'center';
promptDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
promptDiv.style.zIndex = '1000';
document.body.appendChild(promptDiv);

// Styling for the romantic message
const style = document.createElement('style');
style.innerHTML = `
  .romantic-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
  }

  .romantic-message {
    padding: 20px;
    background: rgba(255, 192, 203, 0.8);
    border: 2px solid #ff69b4;
    border-radius: 10px;
    text-align: center;
    box-shadow: 0px 4px 15px rgba(0, 0, 0, 0.2);
    animation: fadeIn 2s ease-in-out;
  }

  .romantic-message p {
    font-family: 'Dancing Script', cursive;
    font-size: 24px;
    color: #ffffff;
    margin: 0;
  }

  @keyframes fadeIn {
    0% {
      opacity: 0;
      transform: scale(0.9);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }
`;

// Append style to the document
document.head.appendChild(style);

// Function to remove the prompt and allow audio
function enableAudio() {
    audioAllowed = true; // Allow audio playback
    document.body.removeChild(promptDiv); // Remove prompt
    window.removeEventListener('click', enableAudio); // Remove the listener
}

// Add listener for user interaction
window.addEventListener('click', enableAudio);

const canvasEl = document.querySelector("#fire-overlay");
const scrollMsgEl = document.querySelector(".scroll-msg");

const devicePixelRatio = Math.min(window.devicePixelRatio, 2);

const params = {
    fireTime: .35,
    fireTimeAddition: 0,
    audioVolume: 1 // Parameter to control the fade
};

let st, uniforms;
const gl = initShader();

// Timeline with scrollTrigger
st = gsap.timeline({
    scrollTrigger: {
        trigger: ".page",
        start: "0% 0%", // Start from the top
        end: "100% 100%", // End at the bottom
        scrub: true,
        onUpdate: (self) => {
            const scrollDirection = self.direction; // 1 for down, -1 for up
            const progress = self.progress; // Get progress (0 to 1)

            // Check if page has scrolled past the middle (progress >= 0.5)
            if (progress >= 0.5 && scrollDirection === 1 && audio.paused && audioAllowed) {
                // Scroll down past the middle: play audio
                audio.play();
                gsap.to(params, {
                    duration: 1,
                    audioVolume: 1, // Volume up smoothly
                    onUpdate: () => {
                        audio.volume = params.audioVolume;
                    }
                });
            } else if (progress < 0.5 && scrollDirection === -1 && !audio.paused && audioAllowed) {
                // Scroll up above the middle: fade out and pause
                gsap.to(params, {
                    duration: 1,
                    audioVolume: 0, // Fade out
                    onUpdate: () => {
                        audio.volume = params.audioVolume;
                    },
                    onComplete: () => {
                        audio.pause();
                    }
                });
            }
        }
    }
})
    .to(scrollMsgEl, {
        duration: .1,
        opacity: 0
    }, 0)
    .to(params, {
        fireTime: .63
    }, 0);

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

gsap.set(".page", {
    opacity: 1
});

function initShader() {
    const vsSource = document.getElementById("vertShader").innerHTML;
    const fsSource = document.getElementById("fragShader").innerHTML;

    const gl = canvasEl.getContext("webgl") || canvasEl.getContext("experimental-webgl");

    if (!gl) {
        alert("WebGL is not supported by your browser.");
    }

    function createShader(gl, sourceCode, type) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, sourceCode);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    const vertexShader = createShader(gl, vsSource, gl.VERTEX_SHADER);
    const fragmentShader = createShader(gl, fsSource, gl.FRAGMENT_SHADER);

    function createShaderProgram(gl, vertexShader, fragmentShader) {
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("Unable to initialize the shader program: " + gl.getProgramInfoLog(program));
            return null;
        }

        return program;
    }

    const shaderProgram = createShaderProgram(gl, vertexShader, fragmentShader);
    uniforms = getUniforms(shaderProgram);

    function getUniforms(program) {
        let uniforms = [];
        let uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < uniformCount; i++) {
            let uniformName = gl.getActiveUniform(program, i).name;
            uniforms[uniformName] = gl.getUniformLocation(program, uniformName);
        }
        return uniforms;
    }

    const vertices = new Float32Array([-1., -1., 1., -1., -1., 1., 1., 1.]);

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    gl.useProgram(shaderProgram);

    const positionLocation = gl.getAttribLocation(shaderProgram, "a_position");
    gl.enableVertexAttribArray(positionLocation);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    return gl;
}

function render() {
    const currentTime = performance.now();
    gl.uniform1f(uniforms.u_time, currentTime);

    gl.uniform1f(uniforms.u_progress, params.fireTime + params.fireTimeAddition);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    requestAnimationFrame(render);
}

function resizeCanvas() {
    canvasEl.width = window.innerWidth * devicePixelRatio;
    canvasEl.height = window.innerHeight * devicePixelRatio;
    gl.viewport(0, 0, canvasEl.width, canvasEl.height);
    gl.uniform2f(uniforms.u_resolution, canvasEl.width, canvasEl.height);
    render();
}
