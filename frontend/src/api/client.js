const baseURL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

async function request(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${baseURL}${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw {
      response: {
        status: response.status,
        data: typeof data === "string" ? { detail: data } : data,
      },
    };
  }

  return { data };
}

const api = {
  get(path) {
    return request(path);
  },
  post(path, body) {
    return request(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  put(path, body) {
    return request(path, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },
  delete(path) {
    return request(path, {
      method: "DELETE",
    });
  },
};

export default api;
