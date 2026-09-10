import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { seedAuthData } from "../database/seeds/auth.seed.mjs";
import { userRepository } from "../database/repositories/user.repository.mjs";

await seedAuthData();

const server = createApp(apiRoutes);

await new Promise((resolve) => server.listen(0, resolve));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

async function request(method, path, { body, token } = {}) {
  const headers = { "Content-Type": "application/json" };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  return { status: response.status, body: await response.json() };
}

const failed = [];

function assert(name, condition) {
  if (!condition) {
    failed.push(name);
    console.error(`FAIL ${name}`);
  } else {
    console.log(`OK   ${name}`);
  }
}

const login = await request("POST", "/api/v1/auth/login", {
  body: { email: "director@prece.local", password: "Director123!" }
});
assert("login director", login.status === 200 && login.body.accessToken && login.body.refreshToken);

const me = await request("GET", "/api/v1/auth/me", { token: login.body.accessToken });
assert("me", me.status === 200 && me.body.data.email === "director@prece.local");

const studentsOk = await request("GET", "/api/v1/schools/esc-1/courses/cur-1/divisions/div-a/students", { token: login.body.accessToken });
assert("students school 1", studentsOk.status === 200 && studentsOk.body.data.length === 1);

const studentsDenied = await request("GET", "/api/v1/schools/esc-2/courses/cur-1/divisions/div-a/students", { token: login.body.accessToken });
assert("students school 2 forbidden", studentsDenied.status === 403);

const inactive = await request("POST", "/api/v1/auth/login", {
  body: { email: "inactivo@prece.local", password: "Inactivo123!" }
});
assert("inactive login", inactive.status === 401);

const docente = await request("POST", "/api/v1/auth/login", {
  body: { email: "docente@prece.local", password: "Docente123!" }
});
const docenteStudents = await request("GET", "/api/v1/schools/esc-1/courses/cur-1/divisions/div-a/students?subjectId=mat&shiftId=manana&periodId=2026", {
  token: docente.body.accessToken
});
assert("docente students matching scope", docenteStudents.status === 200);

const docenteBroad = await request("GET", "/api/v1/schools/esc-1/courses/cur-1/divisions/div-a/students", { token: docente.body.accessToken });
assert("docente course scope allowed", docenteBroad.status === 200);

const docenteId = userRepository.findByEmail("docente@prece.local").id;
const deactivateDenied = await request("PATCH", "/api/v1/users/" + docenteId + "/deactivate", {
  token: docente.body.accessToken
});
assert("docente cannot deactivate", deactivateDenied.status === 403);

const deactivate = await request("PATCH", "/api/v1/users/" + docenteId + "/deactivate", {
  token: login.body.accessToken
});
assert("director deactivates docente", deactivate.status === 200 && deactivate.body.data.isActive === false);

const docenteAfter = await request("POST", "/api/v1/auth/login", {
  body: { email: "docente@prece.local", password: "Docente123!" }
});
assert("deactivated cannot login", docenteAfter.status === 401);

const refreshed = await request("POST", "/api/v1/auth/refresh", { body: { refreshToken: login.body.refreshToken } });
assert("refresh", refreshed.status === 200 && refreshed.body.refreshToken !== login.body.refreshToken);

const reuse = await request("POST", "/api/v1/auth/refresh", { body: { refreshToken: login.body.refreshToken } });
assert("refresh reuse blocked", reuse.status === 401);

const logout = await request("POST", "/api/v1/auth/logout", { body: { refreshToken: refreshed.body.refreshToken } });
assert("logout", logout.status === 200 && logout.body.ok === true);

const afterLogout = await request("POST", "/api/v1/auth/refresh", { body: { refreshToken: refreshed.body.refreshToken } });
assert("refresh after logout blocked", afterLogout.status === 401);

server.close();

if (failed.length) {
  console.error(`\n${failed.length} fallos`);
  process.exit(1);
}

console.log("\nTodos los chequeos pasaron");





