# 🐬 How to Set Up & Customize Database Name in XAMPP / phpMyAdmin

This guide explains step-by-step how to **set or change your database name**, import it into **XAMPP / phpMyAdmin**, and run the app on **localhost**.

---

## 🛠️ Step 1: Configure Your Database Name in `.env`

Open the **`.env`** file located in the root directory of your project:

```env
# MySQL Connection Settings for XAMPP
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=smart_barangay_db    <--- CHANGE THIS to your desired database name!

PORT=5000
```

> 💡 **Tip:** If your phpMyAdmin user has no password (default in XAMPP), leave `DB_PASSWORD=` blank.

---

## 💻 Step 2: Import into XAMPP phpMyAdmin

1. Open your browser and go to **`http://localhost/phpmyadmin`**.
2. Click on **Import** in the top menu tab.
3. Click **Choose File** and select **`database/schema.sql`** from this project directory.
4. Click **Import** (or **Go**) at the bottom.
   *(This creates the database tables automatically!)*
5. Next, click **Choose File** again and select **`database/seed.sql`**.
6. Click **Import** (or **Go**) to populate sample data.

---

## ✏️ Step 3: Changing Database Name in SQL Files (Optional)

If you chose a custom database name (for example `my_barangay_db` instead of `smart_barangay_db`):

1. Update **`DB_NAME=my_barangay_db`** in `.env`.
2. In **`database/schema.sql`** (lines 6-7), change `smart_barangay_db` to `my_barangay_db`:
   ```sql
   CREATE DATABASE IF NOT EXISTS `my_barangay_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   USE `my_barangay_db`;
   ```
3. In **`database/seed.sql`** (line 5), change `smart_barangay_db` to `my_barangay_db`:
   ```sql
   USE `my_barangay_db`;
   ```

---

## 🚀 Step 4: Run the Application on Localhost

Open your terminal in the project directory:

1. **Start the Express MySQL API server**:
   ```bash
   npm run server
   ```
   *(You should see: `✅ [MySQL] Connected successfully to localhost:3306/smart_barangay_db`)*

2. **In a second terminal, start the Vite frontend**:
   ```bash
   npm run dev
   ```

3. Open **`http://localhost:5173`** in your browser!
