import bcrypt from "bcryptjs";
import Employee from "../models/Employee.js";
import Group from "../models/Group.js";
import Member from "../models/Member.js";

/* =================================================
   EMPLOYEE CRUD
   ================================================= */

// ADD EMPLOYEE (let middleware hash)
export const addEmployee = async (req, res) => {
  try {
    const { emp_id, name, email, phone, address, password } = req.body;

    if (!emp_id || !name || !phone || !address || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const exists = await Employee.findOne({ emp_id });
    if (exists) {
      return res.status(400).json({ message: "Employee already exists" });
    }

    const employee = new Employee({
      emp_id,
      name,
      email,
      phone,
      address,
      password, // ✅ plain password
    });

    await employee.save(); // ✅ middleware hashes

    res.status(201).json({ message: "Employee added", employee });
  } catch (err) {
    res.status(500).json({ message: "Failed to add employee" });
  }
};

// GET ALL EMPLOYEES
export const getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({}, { password: 0 });
    res.json(employees);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch employees" });
  }
};

// GET SINGLE EMPLOYEE
export const getEmployee = async (req, res) => {
  try {
    const employee = await Employee.findOne(
      { emp_id: req.params.emp_id },
      { password: 0 }
    );

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.json(employee);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch employee" });
  }
};

// ✅ UPDATE EMPLOYEE (FIXED)
export const updateEmployee = async (req, res) => {
  try {
      console.log("Received featureAccess:", req.body.featureAccess);
    const employee = await Employee.findOne({ emp_id: req.params.emp_id });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // update normal fields
    employee.name = req.body.name ?? employee.name;
    employee.email = req.body.email ?? employee.email;
    employee.phone = req.body.phone ?? employee.phone;
    employee.address = req.body.address ?? employee.address;
    employee.status = req.body.status ?? employee.status; 
    employee.featureAccess =
  req.body.featureAccess ?? employee.featureAccess;

    // ✅ HANDLE PASSWORD CORRECTLY
    if (req.body.password && req.body.password.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
     employee.password = req.body.password; // ✅ plain
    }

    await employee.save(); // ✅ triggers middleware also

    res.json({ message: "Employee updated", employee });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update employee" });
  }
};

// DELETE EMPLOYEE
export const deleteEmployee = async (req, res) => {
  try {
    await Employee.findOneAndDelete({ emp_id: req.params.emp_id });
    res.json({ message: "Employee deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete employee" });
  }
};

/* =================================================
   EMPLOYEE LOGIN
   ================================================= */

export const loginEmployee = async (req, res) => {
  try {
    const { emp_id, password } = req.body;

    if (!emp_id || !password) {
      return res.status(400).json({ message: "Missing credentials" });
    }

    const employee = await Employee.findOne({ emp_id });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    if (employee.status !== "active") {
      return res.status(403).json({ message: "Account is inactive" });
    }

    const isMatch = await bcrypt.compare(password, employee.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    res.json({
      message: "Login successful",
      employee: {
        emp_id: employee.emp_id,
        name: employee.name,
        phone: employee.phone,
        status: employee.status,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Login failed" });
  }
};

/* =================================================
   DASHBOARD + COLLECTIONS (UNCHANGED)
   ================================================= */

export const getEmployeeDashboardSummary = async (req, res) => {
  try {
    const totalGroups = await Group.countDocuments();
    const totalMembers = await Member.countDocuments();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let todayCollection = 0;
    let pendingCount = 0;

    const groups = await Group.find();

    groups.forEach((group) => {
      group.members.forEach((member) => {
        member.collections.forEach((month) => {
          const totalPaid = month.payments.reduce(
            (sum, p) => sum + p.amount,
            0
          );

          if (totalPaid < group.installmentAmount) {
            pendingCount++;
          }

          month.payments.forEach((payment) => {
            if (payment.paidAt >= todayStart) {
              todayCollection += payment.amount;
            }
          });
        });
      });
    });

    res.json({
      totalGroups,
      totalMembers,
      todayCollection,
      pendingCount,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to load dashboard data" });
  }
};

export const getEmployeeCollections = async (req, res) => {
  try {
    const collections = [];
    const groups = await Group.find();

    groups.forEach((group) => {
      group.members.forEach((member) => {
        member.collections.forEach((month) => {
          month.payments.forEach((payment) => {
            collections.push({
              groupId: group.groupId,
              chitId: group.chitId,
              memberId: member.memberId,
              monthIndex: month.monthIndex,
              amount: payment.amount,
              date: payment.paidAt,
              collectedBy: payment.collectedBy,
            });
          });
        });
      });
    });

    collections.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(collections);
  } catch (err) {
    res.status(500).json({ message: "Failed to load collections" });
  }
};

export const checkEmployeeStatus = async (req, res) => {
  try {
    const employee = await Employee.findOne({ emp_id: req.params.emp_id });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

res.json({
  status: employee.status,
  featureAccess: employee.featureAccess,
});

  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
};



/* =================================================
   ADMIN: GET EMPLOYEE COLLECTIONS BY DATE
   ================================================= */

export const getEmployeeCollectionsByDate = async (req, res) => {
  try {
    const { emp_id } = req.params;
    const { date } = req.query;

    // ================= VALIDATION =================
    if (!emp_id) {
      return res.status(400).json({
        message: "Employee ID is required",
      });
    }

    if (!date) {
      return res.status(400).json({
        message: "Date is required",
      });
    }

    // ================= CHECK EMPLOYEE =================
    const employee = await Employee.findOne(
      { emp_id },
      { password: 0 }
    );

    if (!employee) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    // date expected: YYYY-MM-DD
    const selectedDate = new Date(`${date}T00:00:00`);

    if (Number.isNaN(selectedDate.getTime())) {
      return res.status(400).json({
        message: "Invalid date",
      });
    }

    // Create local-day boundaries.
    // This is important because your business dates are India-local dates.
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    // ================= GET GROUPS =================
    // Only fetch groups containing at least one payment
    // collected by this employee on this date.
    const groups = await Group.find({
      members: {
        $elemMatch: {
          collections: {
            $elemMatch: {
              payments: {
                $elemMatch: {
                  employeeId: emp_id,
                  paidAt: {
                    $gte: startOfDay,
                    $lte: endOfDay,
                  },
                },
              },
            },
          },
        },
      },
    });

    const memberIds = new Set();

    // First collect member IDs so we can resolve names.
    groups.forEach((group) => {
      group.members.forEach((member) => {
        member.collections.forEach((collection) => {
          collection.payments.forEach((payment) => {
            if (
              payment.employeeId === emp_id &&
              payment.paidAt >= startOfDay &&
              payment.paidAt <= endOfDay
            ) {
              memberIds.add(member.memberId);
            }
          });
        });
      });
    });

    // ================= GET MEMBER NAMES =================
    const members = await Member.find(
      {
        userid: {
          $in: Array.from(memberIds),
        },
      },
      {
        userid: 1,
        username: 1,
        phone: 1,
      }
    );

    const memberMap = {};

    members.forEach((member) => {
      memberMap[member.userid] = {
        name: member.username,
        phone: member.phone,
      };
    });

    // ================= BUILD COLLECTION LIST =================
    const collections = [];

    groups.forEach((group) => {
      group.members.forEach((member) => {
        member.collections.forEach((collection) => {
          collection.payments.forEach((payment) => {
            if (!payment.paidAt) return;

            const paymentDate = new Date(payment.paidAt);

            const isSelectedEmployee =
              payment.employeeId === emp_id;

            const isSelectedDate =
              paymentDate >= startOfDay &&
              paymentDate <= endOfDay;

            if (isSelectedEmployee && isSelectedDate) {
              collections.push({
                paymentId: payment._id,

                groupId: group.groupId,
                chitId: group.chitId,

                memberId: member.memberId,
                groupMemberId: member.groupMemberId,

                memberName:
                  memberMap[member.memberId]?.name || "Unknown",

                memberPhone:
                  memberMap[member.memberId]?.phone || "",

                monthIndex: collection.index,

                amount: Number(payment.amount) || 0,

                paymentType:
                  payment.paymentType || "INSTALLMENT",

                paymentMode:
                  payment.paymentMode || "Cash",

                employeeId:
                  payment.employeeId || "",

                employeeName:
                  payment.employeeName ||
                  employee.name ||
                  "",

                collectedBy:
                  payment.collectedBy ||
                  payment.employeeName ||
                  employee.name ||
                  "",

                paidAt: payment.paidAt,
              });
            }
          });
        });
      });
    });

    // newest payment first
    collections.sort(
      (a, b) =>
        new Date(b.paidAt).getTime() -
        new Date(a.paidAt).getTime()
    );

    // ================= TOTALS =================
    const totalAmount = collections.reduce(
      (sum, payment) =>
        sum + (Number(payment.amount) || 0),
      0
    );

    const cashAmount = collections
      .filter((payment) => payment.paymentMode === "Cash")
      .reduce(
        (sum, payment) =>
          sum + (Number(payment.amount) || 0),
        0
      );

    const upiAmount = collections
      .filter((payment) => payment.paymentMode === "UPI")
      .reduce(
        (sum, payment) =>
          sum + (Number(payment.amount) || 0),
        0
      );

    const chequeAmount = collections
      .filter((payment) => payment.paymentMode === "Cheque")
      .reduce(
        (sum, payment) =>
          sum + (Number(payment.amount) || 0),
        0
      );

    const acAmount = collections
      .filter((payment) => payment.paymentMode === "AC")
      .reduce(
        (sum, payment) =>
          sum + (Number(payment.amount) || 0),
        0
      );

    const installmentAmount = collections
      .filter(
        (payment) =>
          payment.paymentType !== "PENALTY"
      )
      .reduce(
        (sum, payment) =>
          sum + (Number(payment.amount) || 0),
        0
      );

    const penaltyAmount = collections
      .filter(
        (payment) =>
          payment.paymentType === "PENALTY"
      )
      .reduce(
        (sum, payment) =>
          sum + (Number(payment.amount) || 0),
        0
      );

    // ================= RESPONSE =================
    res.json({
      employee: {
        emp_id: employee.emp_id,
        name: employee.name,
        phone: employee.phone,
      },

      date,

      totalCollections: collections.length,
      totalAmount,

      paymentModeTotals: {
        cash: cashAmount,
        upi: upiAmount,
        cheque: chequeAmount,
        ac: acAmount,
      },

      paymentTypeTotals: {
        installment: installmentAmount,
        penalty: penaltyAmount,
      },

      collections,
    });
  } catch (error) {
    console.error(
      "❌ Employee Collections By Date Error:",
      error
    );

    res.status(500).json({
      message: "Failed to load employee collections",
      error: error.message,
    });
  }
};