async function adminLogin() {
  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value;

  if (!email || !password) {
    alert("Enter your email and password.");
    return;
  }

  try {
    const response = await fetch("/admin-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (data.success) {
      localStorage.setItem("adminLoggedIn", "true");
      window.location.href = "/admin.html";
    } else {
      alert(data.message || "Invalid email or password.");
    }

  } catch (err) {
    alert("Unable to connect to the server.");
  }
}