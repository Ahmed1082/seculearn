const CTF_API_BASE_URL = "/api";

const getStoredToken = () => {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
};

const buildHeaders = ({ token, hasJsonBody = false, headers = {} } = {}) => {
  const resolvedToken = token || getStoredToken();

  return {
    Accept: "application/json",
    "ngrok-skip-browser-warning": "true",
    "bypass-tunnel-reminder": "true",
    ...(hasJsonBody ? { "Content-Type": "application/json" } : {}),
    ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {}),
    ...headers,
  };
};

const unwrapPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload?.data !== undefined) return payload.data;
  if (payload?.challenge !== undefined) return payload.challenge;
  return payload;
};

const extractErrorMessage = (payload, fallbackMessage) => {
  if (typeof payload === "string" && payload.trim()) return payload.trim();

  if (payload?.errors && typeof payload.errors === "object") {
    for (const value of Object.values(payload.errors)) {
      if (Array.isArray(value) && value[0]) return String(value[0]);
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }

  return (
    payload?.message ||
    payload?.error ||
    payload?.detail ||
    fallbackMessage
  );
};

async function requestCTFApi(path, options = {}) {
  const { method = "GET", token, body, headers } = options;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const hasJsonBody = body !== undefined && !isFormData;

  const response = await fetch(`${CTF_API_BASE_URL}${path}`, {
    method,
    headers: buildHeaders({ token, hasJsonBody, headers }),
    ...(body !== undefined ? { body: isFormData ? body : JSON.stringify(body) } : {}),
  });

  const rawText = await response.text();
  let payload = null;

  if (rawText) {
    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = rawText;
    }
  }

  if (!response.ok) {
    const error = new Error(
      extractErrorMessage(payload, `Request failed with status ${response.status}.`)
    );
    error.status = response.status;
    error.data = payload;
    throw error;
  }

  return payload;
}

const normalizeDifficulty = (difficulty = "easy") =>
  String(difficulty || "easy").toLowerCase();

const normalizeFile = (file) => {
  if (!file) return null;
  if (typeof file === "string") {
    return { name: file.split("/").pop() || "challenge file", url: file, size: "" };
  }

  return {
    name: file.file_original_name || file.original_name || file.name || file.filename || "challenge file",
    url: file.file_url || file.url || file.path || file.challenge_file || "",
    size: file.size || file.file_size || "",
  };
};

export const normalizeCTFHint = (hint = {}, index = 0) => ({
  id: hint.id ?? hint.hint_id ?? `hint-${index}`,
  challengeId: hint.challenge_id ?? hint.challengeId ?? null,
  text: hint.hint_text || hint.text || hint.hint || "",
  costPoints: Number(hint.cost_points ?? hint.deducted_points ?? hint.cost ?? 0),
  revealed: Boolean(hint.revealed || hint.is_revealed),
});

export const normalizeCTFChallenge = (challenge = {}) => {
  const externalUrl = challenge.external_url || challenge.lab_url || "";
  const labType = challenge.lab_type === "external" || externalUrl ? "external" : "docker";
  const fileFromFields = normalizeFile({
    file_original_name: challenge.file_original_name,
    file_url: challenge.file_url,
    challenge_file: challenge.challenge_file,
  });
  const files = [
    ...(Array.isArray(challenge.files) ? challenge.files.map(normalizeFile).filter(Boolean) : []),
    ...(fileFromFields?.url || fileFromFields?.name !== "challenge file" ? [fileFromFields] : []),
  ];

  return {
    raw: challenge,
    id: challenge.id ?? challenge.challenge_id,
    courseId: challenge.course_id ?? challenge.courseId ?? null,
    title: challenge.title || "Untitled Challenge",
    description: challenge.description || "",
    shortDescription: challenge.shortDescription || challenge.description || "",
    category: challenge.category || "Web Exploitation",
    difficulty: normalizeDifficulty(challenge.difficulty),
    points: Number(challenge.points || 0),
    flag: challenge.flag || "",
    isCaseSensitive: Boolean(challenge.is_case_sensitive ?? challenge.case_sensitive ?? true),
    maxAttempts: Number(challenge.max_attempts || 0),
    dockerImage: challenge.docker_image || null,
    externalUrl,
    labType,
    determinedImage: challenge.determined_image || challenge.docker_image || "",
    // NOTE: Backend bug — revealing a hint may incorrectly set is_solved to true.
    // We accept is_solved only when it's strictly boolean true (not "1", 1, or "true").
    // The `solved` fallback is used for locally-hardcoded challenge data.
    isSolved: challenge.is_solved === true || challenge.solved === true,
    solved: challenge.is_solved === true || challenge.solved === true,
    solvesCount: Number(challenge.solves_count ?? challenge.solve_count ?? challenge.solves ?? 0),
    solves: Number(challenge.solves_count ?? challenge.solve_count ?? challenge.solves ?? 0),
    fileUrl: challenge.file_url || fileFromFields?.url || "",
    fileOriginalName: challenge.file_original_name || fileFromFields?.name || "",
    files,
    hints: Array.isArray(challenge.hints)
      ? challenge.hints.map(normalizeCTFHint)
      : [],
    createdAt: challenge.created_at || "",
    updatedAt: challenge.updated_at || "",
  };
};

export const unwrapCTFData = unwrapPayload;

export async function getInstructorChallenges(token) {
  const payload = await requestCTFApi("/get-my-challenges", { token });
  const data = unwrapPayload(payload);
  return Array.isArray(data) ? data.map(normalizeCTFChallenge) : [];
}

export async function getStudentChallenges(token, courseId) {
  const path = courseId ? `/student/ctf-challenges/${courseId}` : "/student/get-ctf-challenges";
  const payload = await requestCTFApi(path, { token });
  const data = unwrapPayload(payload);
  return Array.isArray(data) ? data.map(normalizeCTFChallenge) : [];
}

export async function getChallengeForEdit(id, token) {
  const payload = await requestCTFApi(`/get-ctf-challenge-data/${id}`, { token });
  return normalizeCTFChallenge(unwrapPayload(payload) || {});
}

export async function getChallengeStats(id, token) {
  const payload = await requestCTFApi(`/challenge-stats/${id}`, { token });
  return payload || {};
}

export async function createCTFChallenge(data, token, courseId) {
  return requestCTFApi("/create-ctf-challenge", {
    method: "POST",
    token,
    body: data,
    headers: courseId ? { "x-course-id": String(courseId) } : {},
  });
}

export async function updateCTFChallenge(id, data, token, courseId) {
  return requestCTFApi(`/edit-ctf-challenge/${id}`, {
    method: "POST",
    token,
    body: data,
    headers: courseId ? { "x-course-id": String(courseId) } : {},
  });
}

export async function deleteCTFChallenge(id, token) {
  return requestCTFApi(`/delete-ctf-challenge/${id}`, {
    method: "DELETE",
    token,
  });
}

export async function launchCTFLab(id, token) {
  const payload = await requestCTFApi(`/student/ctf/launch-lab/${id}`, {
    method: "POST",
    token,
  });
  return unwrapPayload(payload) || payload || {};
}

export async function stopCTFLab(id, token) {
  return requestCTFApi(`/student/ctf/stop-lab/${id}`, {
    method: "POST",
    token,
  });
}

export async function checkCTFLabStatus(id, token) {
  const payload = await requestCTFApi(`/student/ctf/lab-status/${id}`, { token });
  return unwrapPayload(payload) || payload || {};
}

export async function revealCTFHint(id, token) {
  return requestCTFApi(`/student/ctf/reveal-hint/${id}`, {
    method: "POST",
    token,
  });
}

export async function submitCTFFlag(id, flag, token) {
  return requestCTFApi(`/student/ctf/submit-flag/${id}`, {
    method: "POST",
    token,
    body: { flag },
  });
}

export function buildCTFFormData(values) {
  const hasFile = values.files?.some(
    (file) => typeof File !== "undefined" && file.file instanceof File
  );
  const dockerImage = values.labType === "docker" ? values.dockerImage?.trim() || null : null;
  const externalUrl = values.labType === "external" ? values.labUrl?.trim() || null : null;

  if (!hasFile) {
    return {
      title: values.title,
      description: values.description,
      category: values.category,
      difficulty: values.difficulty,
      points: values.points,
      flag: values.flag,
      docker_image: dockerImage,
      external_url: externalUrl,
      is_case_sensitive: values.isCaseSensitive,
      max_attempts: values.maxAttempts,
      hints: values.hints,
      course_id: values.courseId ? Number(values.courseId) : null,
    };
  }

  const formData = new FormData();
  formData.append("title", values.title);
  formData.append("description", values.description);
  formData.append("category", values.category);
  formData.append("difficulty", values.difficulty);
  formData.append("points", String(values.points));
  formData.append("flag", values.flag);
  formData.append("docker_image", dockerImage || "");
  formData.append("external_url", externalUrl || "");
  formData.append("is_case_sensitive", values.isCaseSensitive ? "1" : "0");
  formData.append("max_attempts", String(values.maxAttempts || 0));
  if (values.courseId) {
    formData.append("course_id", String(values.courseId));
  }

  values.files.forEach((file) => {
    if (typeof File !== "undefined" && file.file instanceof File) {
      formData.append("challenge_file", file.file, file.file.name);
    }
  });

  values.hints.forEach((hint, index) => {
    formData.append(`hints[${index}][hint_text]`, hint.hint_text);
    formData.append(`hints[${index}][cost_points]`, String(hint.cost_points));
  });

  return formData;
}
