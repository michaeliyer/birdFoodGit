console.log("🔍 Checking DOM elements...");
console.log("🟢 Close Button Exists?", document.getElementById("closeDetails"));
console.log("🟢 Details Container Exists?", document.getElementById("recipeDetailsContainer"));




const dbName = "birdFoodGitDB";
const dbVersion = 1;
let db;

// Open IndexedDB
const request = indexedDB.open(dbName, dbVersion);

request.onupgradeneeded = function (event) {
    db = event.target.result;
    console.log("🆕 Upgrading Database...");

    if (db.objectStoreNames.contains("recipes")) {
        db.deleteObjectStore("recipes");
    }

    const store = db.createObjectStore("recipes", { keyPath: "id", autoIncrement: true });
    store.createIndex("dishName", "dishName", { unique: false });
    store.createIndex("color", "color", { unique: false });
    store.createIndex("image", "image", { unique: false });
};

request.onsuccess = function (event) {
    db = event.target.result;
    console.log("✅ Database successfully opened.");
    displaySavedRecipes();
};

request.onerror = function (event) {
    console.error("❌ Database error:", event.target.error);
};

document.getElementById("addDishBtn").addEventListener("click", function () {
    const dishFormContainer = document.getElementById("dishFormContainer");
    if (!dishFormContainer) {
        console.error("❌ dishFormContainer not found!");
        return;
    }
    dishFormContainer.classList.toggle("hidden");
});

document.getElementById("chooseColorBtn").addEventListener("click", function () {
    const colorPalette = document.getElementById("colorPalette");
    colorPalette.classList.toggle("hidden"); // Toggle visibility

    if (colorPalette.innerHTML.trim() !== "") return; // Prevent reloading if already populated

    fetch("birdFoodColors.json")
        .then(response => response.json())
        .then(data => {
            console.log("🎨 Loaded Colors:", data);

            // Ensure it's an array of objects
            const allColors = [];
            Object.values(data).forEach(categoryColors => {
                if (Array.isArray(categoryColors)) {
                    categoryColors.forEach(colorObj => {
                        if (colorObj.hex) {
                            allColors.push({ hex: colorObj.hex, name: colorObj.name || "Unnamed Color" });
                        }
                    });
                }
            });

            console.log("🟢 Final Color List:", allColors);

            colorPalette.innerHTML = ""; // Clear existing content
            colorPalette.style.display = "flex"; // Ensure visibility

            allColors.forEach(colorObj => {
                const box = document.createElement("div");
                box.classList.add("color-box");
                box.style.backgroundColor = colorObj.hex;
                box.dataset.color = colorObj.hex;
                box.title = `${colorObj.name} (${colorObj.hex})`;

                box.addEventListener("click", function () {
                    document.getElementById("chooseColorBtn").textContent = `Color: ${colorObj.name}`;
                    document.getElementById("chooseColorBtn").dataset.color = colorObj.hex;
                    colorPalette.classList.add("hidden"); // Hide after selection
                });

                colorPalette.appendChild(box);
            });

            console.log("✅ Color palette generated.");
        })
        .catch(error => console.error("❌ Error loading colors:", error));
});

document.getElementById("saveDishBtn").addEventListener("click", function () {
    const dishName = document.getElementById("dishName").value.trim();
    const selectedColor = document.getElementById("chooseColorBtn").dataset.color;
    const imageInput = document.getElementById("dishImage").files[0];

    if (!dishName || !selectedColor) {
        alert("Dish Name and Color are required!");
        return;
    }

    if (imageInput) {
        const reader = new FileReader();
        reader.onload = function (event) {
            saveRecipe(dishName, selectedColor, event.target.result);
        };
        reader.readAsDataURL(imageInput);
    } else {
        saveRecipe(dishName, selectedColor, null);
    }
});


function saveRecipe(dishName, color, image) {
    if (!db) {
        console.error("❌ Database not initialized.");
        return;
    }

    const transaction = db.transaction(["recipes"], "readwrite");
    const store = transaction.objectStore("recipes");

    const newRecipe = { dishName, color, image };

    const request = store.add(newRecipe);

    request.onsuccess = function () {
        console.log("✅ Recipe saved:", newRecipe);
        displaySavedRecipes();
    };

    request.onerror = function (event) {
        console.error("❌ Error saving recipe:", event.target.error);
    };
}
function displaySavedRecipes() {
    if (!db) {
        setTimeout(displaySavedRecipes, 500);
        return;
    }

    const transaction = db.transaction(["recipes"], "readonly");
    const store = transaction.objectStore("recipes");
    const request = store.getAll();

    request.onsuccess = function () {
        const recipes = request.result;
        console.log("📂 Retrieved recipes:", recipes);

        const savedDishesDiv = document.getElementById("savedDishes");
        savedDishesDiv.innerHTML = "";

        if (recipes.length === 0) {
            savedDishesDiv.innerHTML = "<p>No saved recipes.</p>";
            return;
        }

        recipes.forEach(recipe => {
            const recipeBox = document.createElement("div");
            recipeBox.className = "recipe-box";
            recipeBox.style.backgroundColor = recipe.color;
            recipeBox.dataset.id = Number(recipe.id);

            // ✅ Dish Name Overlay
            const dishText = document.createElement("p");
            dishText.textContent = recipe.dishName;
            dishText.style.position = "absolute";
            dishText.style.bottom = "5px";
            dishText.style.width = "100%";
            dishText.style.textAlign = "center";
            dishText.style.background = "rgba(0,0,0,0.5)";
            dishText.style.color = "white";
            dishText.style.padding = "2px 0";

            // ✅ Clickable Image
            if (recipe.image) {
                const dishImage = document.createElement("img");
                dishImage.src = recipe.image;
                dishImage.alt = recipe.dishName;
                dishImage.style.width = "100%";
                dishImage.style.height = "100%";
                dishImage.style.objectFit = "cover";
                dishImage.style.borderRadius = "10px";
                dishImage.style.cursor = "pointer";

                // ✅ Clicking opens hidden menu
                dishImage.addEventListener("click", function () {
                    showRecipeDetails(recipe);
                });

                recipeBox.appendChild(dishImage);
            }

            // ✅ Delete Button
            const deleteBtn = document.createElement("button");
            deleteBtn.textContent = "❌ Delete";
            deleteBtn.className = "delete-btn";
            deleteBtn.addEventListener("click", function (event) {
                event.stopPropagation(); // Prevent opening details when clicking delete
                confirmDeleteRecipe(recipe.id);
            });

            recipeBox.appendChild(dishText);
            recipeBox.appendChild(deleteBtn);
            savedDishesDiv.appendChild(recipeBox);
        });
    };
}
// function displaySavedRecipes() {
//     if (!db) {
//         setTimeout(displaySavedRecipes, 500);
//         return;
//     }

//     const transaction = db.transaction(["recipes"], "readonly");
//     const store = transaction.objectStore("recipes");
//     const request = store.getAll();

//     request.onsuccess = function () {
//         const recipes = request.result;
//         console.log("📂 Retrieved recipes:", recipes);

//         const savedDishesDiv = document.getElementById("savedDishes");
//         savedDishesDiv.innerHTML = "";

//         if (recipes.length === 0) {
//             savedDishesDiv.innerHTML = "<p>No saved recipes.</p>";
//             return;
//         }

//         recipes.forEach(recipe => {
//             const recipeBox = document.createElement("div");
//             recipeBox.className = "recipe-box";
//             recipeBox.style.backgroundColor = recipe.color;
//             recipeBox.dataset.id = Number(recipe.id);

//             // ✅ Ensure text remains readable
//             const dishText = document.createElement("p");
//             dishText.textContent = recipe.dishName;
//             dishText.style.position = "absolute";
//             dishText.style.bottom = "5px";
//             dishText.style.width = "100%";
//             dishText.style.textAlign = "center";
//             dishText.style.background = "rgba(0,0,0,0.5)";
//             dishText.style.color = "white";
//             dishText.style.padding = "2px 0";

//             // ✅ Fix image display and make it clickable
//             if (recipe.image) {
//                 const dishImage = document.createElement("img");
//                 dishImage.src = recipe.image;
//                 dishImage.alt = recipe.dishName;
//                 dishImage.style.width = "100%";
//                 dishImage.style.height = "100%";
//                 dishImage.style.objectFit = "cover";
//                 dishImage.style.borderRadius = "10px";
//                 dishImage.style.cursor = "pointer"; // ✅ Make it look clickable

//                 // ✅ Clicking the image opens the hidden menu
//                 dishImage.addEventListener("click", function () {
//                     console.log(`📸 Clicked on: ${recipe.dishName}`);
//                     showRecipeDetails(recipe);
//                 });

//                 recipeBox.appendChild(dishImage);
//             }

//             recipeBox.appendChild(dishText);
//             savedDishesDiv.appendChild(recipeBox);
//         });
//     };
// };

function confirmDeleteRecipe(recipeId) {
    const confirmation = confirm("⚠️ Are you sure you want to delete this recipe? This action cannot be undone!");
    if (confirmation) {
        deleteRecipe(recipeId);
    }
}

function deleteRecipe(recipeId) {
    if (!db) {
        console.error("❌ Database not initialized.");
        return;
    }

    console.log(`🗑️ Deleting recipe ID: ${recipeId}`);

    const transaction = db.transaction(["recipes"], "readwrite");
    const store = transaction.objectStore("recipes");

    const request = store.delete(recipeId);

    request.onsuccess = function () {
        console.log(`✅ Successfully deleted recipe ID: ${recipeId}`);
        displaySavedRecipes(); // Refresh the UI
    };

    request.onerror = function (event) {
        console.error("❌ Error deleting recipe:", event.target.error);
        alert("⚠️ Error deleting recipe. Please check the console.");
    };
}

function showRecipeDetails(recipe) {
    console.log("🟢 Opening details for:", recipe.dishName);

    const detailsContainer = document.getElementById("recipeDetailsContainer");
    if (!detailsContainer) {
        console.error("❌ Recipe details container NOT FOUND in the DOM!");
        return;
    }

    document.getElementById("detailsDishName").textContent = recipe.dishName;
    const detailsImage = document.getElementById("detailsDishImage");

    if (recipe.image) {
        detailsImage.src = recipe.image;
        detailsImage.style.display = "block";
    } else {
        detailsImage.style.display = "none"; // ✅ Hide if no image
    }

    const detailsColor = document.getElementById("detailsDishColor");

    // ✅ Convert Hex to Color Name (Requires `birdFoodColors.json`)
    fetch("birdFoodColors.json")
        .then(response => response.json())
        .then(data => {
            let colorName = "Unknown Color";
            Object.values(data).forEach(categoryColors => {
                if (Array.isArray(categoryColors)) {
                    categoryColors.forEach(colorObj => {
                        if (colorObj.hex.toLowerCase() === recipe.color.toLowerCase()) {
                            colorName = colorObj.name || "Unnamed Color";
                        }
                    });
                }
            });

            // ✅ Display both Color Name & Hex
            detailsColor.innerHTML = `<strong>${colorName}</strong> (${recipe.color})`;
            detailsColor.style.backgroundColor = recipe.color;

            // ✅ Ensure text color is readable
            const textColor = getContrastColor(recipe.color);
            detailsColor.style.color = textColor;
        })
        .catch(error => {
            console.error("❌ Error fetching colors:", error);
            detailsColor.textContent = recipe.color; // Fallback: Show only hex
        });

    // ✅ Darken the Image for Contrast
    detailsImage.style.filter = "brightness(50%)";

    // ✅ Show the details menu
    detailsContainer.classList.remove("hidden");
}



// ✅ Close Details Menu When "❌" is Clicked
document.getElementById("closeDetails").addEventListener("click", function () {
    document.getElementById("recipeDetailsContainer").classList.add("hidden");
    console.log("❌ Details menu closed.");
});


// ✅ Hide details menu when clicking close button
document.getElementById("recipeDetailsContainer").addEventListener("click", function (event) {
    if (event.target === this) {
        this.classList.add("hidden");
    }
});




document.addEventListener("DOMContentLoaded", function () {
    console.log("🟢 DOM Fully Loaded. Adding event listeners.");

    // ✅ Close Details Menu When "❌" is Clicked
    const closeBtn = document.getElementById("closeDetails");
    if (closeBtn) {
        closeBtn.addEventListener("click", function () {
            console.log("❌ Close button clicked!");
            document.getElementById("recipeDetailsContainer").classList.add("hidden");
        });
    } else {
        console.error("❌ Close button NOT FOUND!");
    }

    // ✅ Clicking Outside Closes the Menu
    const detailsContainer = document.getElementById("recipeDetailsContainer");
    if (detailsContainer) {
        detailsContainer.addEventListener("click", function (event) {
            if (event.target === this) {
                console.log("⬅️ Clicked outside, closing details menu...");
                this.classList.add("hidden");
            }
        });
    } else {
        console.error("❌ Recipe details container NOT FOUND!");
    }
});

    document.getElementById("detailsDishText").textContent = recipe.longText || "No description available";