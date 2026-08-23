const { z } = require('zod');

const ListSemesterQpDepartmentsResponseItem = z.object({
  id: z.number().int(),
  name: z.string(),
  isActive: z.boolean(),
  createdAt: z.string().datetime({"offset":true})
});

const ListSemesterQpDepartmentsResponse = z.array(ListSemesterQpDepartmentsResponseItem);

async function check() {
  const res = await fetch('https://nexora-rp09.onrender.com/api/semester-qp-departments?includeInactive=true');
  const data = await res.json();
  console.log("Data:", data);
  try {
    ListSemesterQpDepartmentsResponse.parse(data);
    console.log("Zod parse success!");
  } catch (e) {
    console.error("Zod parse error:", e);
  }
}
check();
