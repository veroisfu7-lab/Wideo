// Полноэкранный фрагментный шейдер (WebGL2) — основа всех планов ролика.
// Рисует синхронно в useLayoutEffect, поэтому Remotion снимает уже готовый кадр.
import React, { useLayoutEffect, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { HEADER } from "./glsl";

export type Uniforms = Record<string, number | number[]>;

const VS = `#version 300 es
in vec2 aP; void main(){ gl_Position = vec4(aP, 0.0, 1.0); }`;

type Ctx = { gl: WebGL2RenderingContext; prog: WebGLProgram; loc: Map<string, WebGLUniformLocation | null>; frag: string };

const compile = (gl: WebGL2RenderingContext, type: number, src: string) => {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    const lines = src.split("\n").map((l, i) => `${i + 1}: ${l}`).join("\n");
    throw new Error("GLSL: " + log + "\n" + lines.slice(0, 20000));
  }
  return s;
};

export const Shader: React.FC<{ frag: string; u?: Uniforms; scale?: number; style?: React.CSSProperties }> = ({ frag, u = {}, scale = 1, style }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const ctx = useRef<Ctx | null>(null);
  const f = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const W = Math.round(width * scale), H = Math.round(height * scale);

  useLayoutEffect(() => {
    const cv = ref.current!;
    if (!ctx.current || ctx.current.frag !== frag) {
      const gl = cv.getContext("webgl2", { preserveDrawingBuffer: true, antialias: false, alpha: false })!;
      const prog = gl.createProgram()!;
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, HEADER + frag));
      gl.bindAttribLocation(prog, 0, "aP");
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link: " + gl.getProgramInfoLog(prog));
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      ctx.current = { gl, prog, loc: new Map(), frag };
    }
    const { gl, prog, loc } = ctx.current;
    gl.viewport(0, 0, W, H);
    gl.useProgram(prog);
    const all: Uniforms = { uRes: [W, H], uT: f / fps, uF: f, ...u };
    for (const [k, v] of Object.entries(all)) {
      if (!loc.has(k)) loc.set(k, gl.getUniformLocation(prog, k));
      const l = loc.get(k);
      if (!l) continue;
      if (typeof v === "number") gl.uniform1f(l, v);
      else if (v.length === 2) gl.uniform2fv(l, v);
      else if (v.length === 3) gl.uniform3fv(l, v);
      else if (v.length === 4) gl.uniform4fv(l, v);
      else gl.uniform1fv(l, v);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.finish();
  });

  return <canvas ref={ref} width={W} height={H} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", ...style }} />;
};
