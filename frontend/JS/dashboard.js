// Runs when page loads
document.addEventListener("DOMContentLoaded", loadFarmerData);

// Load farmer data from backend
async function loadFarmerData() {

    const mobile = localStorage.getItem("farmerMobile");

    if (!mobile) return;

    try {

        const response = await fetch(`http://localhost:5000/farmer/${mobile}`);
        const farmer = await response.json();

        showFarmerData(farmer);

    } catch (error) {

        console.error("Error loading farmer:", error);

    }
}

// Display farmer data on pages
function showFarmerData(farmer) {

    const name = document.querySelectorAll(".farmer-name");
    name.forEach(el => el.textContent = farmer.firstName);

}

// Logout
function logout(){

    localStorage.removeItem("farmerMobile");

    window.location.href = "signin.html";

}