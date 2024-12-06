import express from "express";
import pg from "pg";
import cors from "cors";
import bodyParser from "body-parser";

const app = express();
const port = process.env.PORT || 3000;
app.use(cors());

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "rbac_data",
  password: "Magic@i11",
  port: 5432,
});

db.connect();

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Users APIs

app.get("/users", async (req, res) => {
  const { page = 1, status, email } = req.query;
  const limit = 30;
  const offset = (page - 1) * limit;

  let query = "SELECT * FROM users";
  let countQuery = "SELECT COUNT(*) FROM users";
  const queryParams = [];
  const whereConditions = [];

  if (status !== undefined) {
    whereConditions.push(`status = $${queryParams.length + 1}`);
    queryParams.push(status === "1");
  }

  if (email) {
    whereConditions.push(`email ILIKE $${queryParams.length + 1}`);
    queryParams.push(`%${email}%`); // Partial matching using ILIKE
  }

  if (whereConditions.length > 0) {
    query += ` WHERE ${whereConditions.join(" AND ")}`;
    countQuery += ` WHERE ${whereConditions.join(" AND ")}`;
  }

  try {
    const finalQuery = `${query} LIMIT $${queryParams.length + 1} OFFSET $${
      queryParams.length + 2
    }`;
    queryParams.push(limit, offset);

    const result = await db.query(finalQuery, queryParams);
    const totalUsersResult = await db.query(
      countQuery,
      queryParams.slice(0, whereConditions.length)
    );
    const total = parseInt(totalUsersResult.rows[0].count);
    const lastPage = Math.ceil(total / limit);

    const from = total === 0 ? 0 : offset + 1;
    const to = total === 0 ? 0 : Math.min(offset + limit, total);

    res.json({
      total,
      page: parseInt(page),
      limit,
      from,
      to,
      last_page: lastPage,
      users: result.rows,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.get("/get-user-info", async (req, res) => {
  const { user_id } = req.query;
  try {
    const result = await db.query("SELECT * FROM users WHERE user_id=$1", [
      user_id,
    ]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

app.get("/delete-user", async (req, res) => {
  const { user_id } = req.query;
  try {
    const result = await db.query("DELETE FROM users WHERE user_id=$1", [
      user_id,
    ]);
    res.status(200).json({
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

app.post("/add-user", async (req, res) => {
  const { name, email, status } = req.body;
  try {
    const result = await db.query(
      "INSERT INTO users (username, email, status) VALUES ($1, $2, $3) RETURNING *",
      [name, email, status]
    );
    res.status(201).json({
      message: "User created successfully",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Error inserting user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

app.post("/update-user", async (req, res) => {
  const { id, name, email, status } = req.body;
  try {
    const result = await db.query(
      "UPDATE users SET username = $1, email = $2, status = $3 WHERE user_id=$4",
      [name, email, status, id]
    );
    res.status(201).json({
      message: "User updated successfully",
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

app.post("/change-user-status", async (req, res) => {
  const { id, status } = req.body;
  try {
    const result = await db.query(
      "UPDATE users SET status = $1 WHERE user_id=$2",
      [status, id]
    );
    res.status(201).json({
      message: "Status changed successfully",
    });
  } catch (error) {
    console.error("Error changing status of user:", error);
    res.status(500).json({ error: "Failed to change status of user" });
  }
});

// Roles APIs
app.get("/roles", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM roles");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching roles:", error);
    res.status(500).json({ error: "Failed to fetch roles" });
  }
});

app.get("/get-role", async (req, res) => {
  const { role_id } = req.query;
  try {
    const result = await db.query("SELECT * FROM roles WHERE id=$1", [role_id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching role:", error);
    res.status(500).json({ error: "Failed to fetch role" });
  }
});

app.get("/delete-role", async (req, res) => {
  const { role_id } = req.query;
  try {
    const result = await db.query("DELETE FROM roles WHERE id=$1", [role_id]);
    res.status(200).json({
      message: "Role deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting role:", error);
    res.status(500).json({ error: "Failed to delete role" });
  }
});

app.post("/create-role", async (req, res) => {
  const { name, message } = req.body;
  const date = new Date();
  try {
    const result = await db.query(
      "INSERT INTO roles (name, message, updated_at) VALUES ($1, $2, $3) RETURNING *",
      [name, message, date]
    );
    res.status(201).json({
      message: "Role created successfully",
      id: result.rows[0].id,
    });
  } catch (error) {
    console.error("Error inserting role:", error);
    res.status(500).json({ error: "Failed to create role" });
  }
});

app.post("/update-role", async (req, res) => {
  const { id, name, message } = req.body;
  const date = new Date();
  try {
    const result = await db.query(
      "UPDATE roles SET name = $1, message = $2, updated_at = $3 WHERE id=$4",
      [name, message, date, id]
    );
    res.status(201).json({
      message: "Role updated successfully",
    });
  } catch (error) {
    console.error("Error updating role:", error);
    res.status(500).json({ error: "Failed to update role" });
  }
});

// Permissions APIs

app.get("/permissions", async (req, res) => {
  const { role_id } = req.query;

  if (!role_id) {
    return res.status(400).json({ error: "role_id is required" });
  }

  try {
    const query = `
      SELECT 
        p.*,
        CASE 
          WHEN rp.permission_id IS NOT NULL THEN 1 
          ELSE 0 
        END AS status
      FROM permissions p
      LEFT JOIN role_permissions rp 
      ON p.id = rp.permission_id AND rp.role_id = $1
    `;

    const result = await db.query(query, [role_id]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching role permissions:", error);
    res.status(500).json({ error: "Failed to fetch role permissions" });
  }
});

app.get("/permissions-in-role", async (req, res) => {
  const { role_id } = req.query;
  try {
    const result = await db.query(
      "SELECT * FROM role_permissions WHERE role_id=$1",
      [role_id]
    );
  } catch (error) {}
});

app.get("/get-permission", async (req, res) => {
  const { id } = req.query;
  try {
    const result = await db.query("SELECT * FROM permissions WHERE id=$1", [
      id,
    ]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching permission:", error);
    res.status(500).json({ error: "Failed to fetch permission" });
  }
});

app.get("/delete-permission", async (req, res) => {
  const { id } = req.query;
  try {
    const result = await db.query("DELETE FROM permissions WHERE id=$1", [id]);
    res.status(200).json({
      message: "Permission deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting permission:", error);
    res.status(500).json({ error: "Failed to delete permission" });
  }
});

app.post("/create-permission", async (req, res) => {
  const { name, about } = req.body;
  try {
    const result = await db.query(
      "INSERT INTO permissions (name, about) VALUES ($1, $2)",
      [name, about]
    );
    res.status(201).json({
      message: "Permission created successfully",
    });
  } catch (error) {
    console.error("Error inserting permission:", error);
    res.status(500).json({ error: "Failed to create permission" });
  }
});

app.post("/update-permission", async (req, res) => {
  const { id, name, about } = req.body;
  try {
    const result = await db.query(
      "UPDATE permissions SET name = $1, about = $2 WHERE id=$3",
      [name, about, id]
    );
    res.status(201).json({
      message: "Permission updated successfully",
    });
  } catch (error) {
    console.error("Error updating permission:", error);
    res.status(500).json({ error: "Failed to update permission" });
  }
});

app.post("/permission-actions", async (req, res) => {
  const { role_id, permission_id, action } = req.body;
  let query = "";
  let message = "";
  let queryParams = [role_id, permission_id];
  if (action == 1) {
    query =
      "INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)";
    message = "Permission assigned successfully";
  } else if (action == 0) {
    query =
      "DELETE FROM role_permissions WHERE role_id=$1 AND permission_id=$2";
    message = "Permission unassigned successfully";
  }
  try {
    const result = await db.query(query, queryParams);
    res.status(200).json({
      message: message,
    });
  } catch (error) {
    console.error("Error assigning/unassigning role:", error);
    res.status(500).json({ error: "Failed to assign/unassign role" });
  }
});

// Users in Role APIs
app.get("/all-users", async (req, res) => {
  const { email, role_id } = req.query;

  try {
    let query = "SELECT * FROM users WHERE role IS NULL OR role != $1";
    const queryParams = [role_id];

    if (email) {
      query += " AND email ILIKE $2";
      queryParams.push(`%${email}%`);
    }

    const result = await db.query(query, queryParams);

    res.status(200).json({
      message: "Users fetched successfully",
      users: result.rows,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.get("/users-in-role", async (req, res) => {
  const { role_id } = req.query;

  if (!role_id) {
    return res.status(400).json({ error: "role_id is required" });
  }

  try {
    const query = "SELECT * FROM users WHERE role = $1";
    const result = await db.query(query, [role_id]);

    res.status(200).json({
      message: "Users fetched successfully",
      users: result.rows,
    });
  } catch (error) {
    console.error("Error fetching users by role:", error);
    res.status(500).json({ error: "Failed to fetch users by role" });
  }
});

app.post("/assign-users-role", async (req, res) => {
  const { users, role_id } = req.body;

  if (!Array.isArray(users) || users.length === 0 || !role_id) {
    return res.status(400).json({
      error:
        "Invalid input. 'users' must be a non-empty array and 'role_id' is required.",
    });
  }

  try {
    await db.query("BEGIN");

    const updateUsersQuery = `
      UPDATE users
      SET role = $1
      WHERE user_id = ANY($2::int[])
    `;
    const updateUsersResult = await db.query(updateUsersQuery, [
      role_id,
      users,
    ]);

    const updateRoleQuery = `
      UPDATE roles
      SET user_count = COALESCE(user_count, 0) + $1
      WHERE id = $2
    `;
    await db.query(updateRoleQuery, [updateUsersResult.rowCount, role_id]);

    await db.query("COMMIT");

    res.status(200).json({
      message: "Role assigned successfully and user count updated",
      updatedRows: updateUsersResult.rowCount,
    });
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("Error assigning role and updating user count:", error);
    res
      .status(500)
      .json({ error: "Failed to assign role and update user count" });
  }
});

app.post("/unassign-user-role", async (req, res) => {
  const { user_id, role_id } = req.body;

  if (!user_id || !role_id) {
    return res.status(400).json({
      error: "Invalid input. Both 'user_id' and 'role_id' are required.",
    });
  }

  try {
    await db.query("BEGIN");

    const updateUserQuery = `
      UPDATE users
      SET role = NULL
      WHERE user_id = $1 AND role = $2
    `;
    const updateUserResult = await db.query(updateUserQuery, [
      user_id,
      role_id,
    ]);

    if (updateUserResult.rowCount === 0) {
      await db.query("ROLLBACK");
      return res.status(400).json({
        error: "User is not assigned to the specified role or does not exist.",
      });
    }

    const updateRoleQuery = `
      UPDATE roles
      SET user_count = COALESCE(user_count, 0) - 1
      WHERE id = $1 AND user_count > 0
    `;
    await db.query(updateRoleQuery, [role_id]);

    await db.query("COMMIT");

    res.status(200).json({
      message: "User unassigned successfully and user count updated",
    });
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("Error unassigning user and updating user count:", error);
    res
      .status(500)
      .json({ error: "Failed to unassign user and update user count" });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
