document.addEventListener("DOMContentLoaded", function () {

    // ==============================
    // GET ELEMENTS
    // ==============================

    const loginForm = document.getElementById("loginForm");
    const errorMsg = document.getElementById("errorMsg");
    const roleButtons = document.querySelectorAll(".role-btn");

    let selectedRole = "farmer";


    // ==============================
    // ROLE SELECTION
    // ==============================

    roleButtons.forEach(function (btn) {

        btn.addEventListener("click", function () {

            roleButtons.forEach(function (b) {
                b.classList.remove("active");
            });

            btn.classList.add("active");

            selectedRole = btn.dataset.role;

            console.log("Selected role:", selectedRole);

        });

    });


    // ==============================
    // FORM SUBMISSION
    // ==============================

    if (loginForm) {

        loginForm.addEventListener("submit", async function (event) {

            event.preventDefault();

            // Clear previous errors
            if (errorMsg) {
                errorMsg.textContent = "";
            }

            const identifier = document.getElementById("identifier").value.trim();
            const password = document.getElementById("password").value;

            if (!identifier || !password) {
                if (errorMsg) {
                    errorMsg.textContent = "Please fill in all fields.";
                }
                return;
            }

            // ==============================
            // SUBMIT BUTTON
            // ==============================

            const submitButton = loginForm.querySelector('button[type="submit"]');
            const originalHTML = submitButton.innerHTML;

            submitButton.textContent = "Signing In...";
            submitButton.disabled = true;

            // ==============================
            // SEND TO BACKEND
            // ==============================

            try {

                const response = await fetch(
                    "/api/auth/login",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        body: JSON.stringify({
                            email: identifier,
                            identifier: identifier,
                            password: password,
                            role: selectedRole
                        })
                    }
                );


                const data = await response.json();


                if (!response.ok) {

                    if (errorMsg) {
                        errorMsg.textContent =
                            data.message ||
                            "Login failed. Please check your credentials.";
                    }

                    return;

                }


                // ==============================
                // SAVE USER DATA
                // ==============================

                if (data.token) {
                    localStorage.setItem(
                        "agrilink_token",
                        data.token
                    );
                }

                if (data.user) {
                    localStorage.setItem(
                        "agrilink_role",
                        data.user.role
                    );

                    localStorage.setItem(
                        "agrilink_user",
                        data.user.name
                    );

                    localStorage.setItem(
                        "agrilink_email",
                        data.user.email
                    );

                    localStorage.setItem(
                        "agrilink_user_id",
                        data.user.id
                    );
                }


                // ==============================
                // REDIRECT TO DASHBOARD
                // ==============================

                const role = data.user ? data.user.role : selectedRole;

                switch (role) {

                    case "farmer":
                        window.location.href = "dashboard-farmer.html";
                        break;

                    case "buyer":
                        window.location.href = "dashboard-buyer.html";
                        break;

                    case "fpo":
                        window.location.href = "dashboard-fpo.html";
                        break;

                    case "admin":
                        window.location.href = "dashboard-admin.html";
                        break;

                    default:
                        window.location.href = "dashboard-farmer.html";
                        break;

                }

            }


            catch (error) {

                console.error(
                    "Login error:",
                    error
                );

                if (errorMsg) {
                    errorMsg.textContent =
                        "Unable to connect to the server. Please try again later.";
                }

            }


            finally {

                submitButton.innerHTML = originalHTML;
                submitButton.disabled = false;

            }

        });

    }

});
