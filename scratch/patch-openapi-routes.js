const fs = require('fs');
let code = fs.readFileSync('lib/api-spec/openapi.yaml', 'utf8');

const routes = `
  /semester-qp-departments:
    get:
      operationId: listSemesterQpDepartments
      tags: [semester-qp-departments]
      summary: List all semester QP departments
      parameters:
        - name: includeInactive
          in: query
          required: false
          schema:
            type: boolean
      responses:
        "200":
          description: List of departments
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/Department"
    post:
      operationId: createSemesterQpDepartment
      tags: [semester-qp-departments]
      summary: Create a new semester QP department
      security: [{ adminSession: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/DepartmentInput"
      responses:
        "201":
          description: Created department
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Department"

  /semester-qp-departments/{id}:
    patch:
      operationId: updateSemesterQpDepartment
      tags: [semester-qp-departments]
      summary: Update a semester QP department
      security: [{ adminSession: [] }]
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/DepartmentUpdate"
      responses:
        "200":
          description: Updated department
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Department"

  /ia-departments:
    get:
      operationId: listIaDepartments
      tags: [ia-departments]
      summary: List all IA departments
      parameters:
        - name: includeInactive
          in: query
          required: false
          schema:
            type: boolean
      responses:
        "200":
          description: List of IA departments
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/Department"
    post:
      operationId: createIaDepartment
      tags: [ia-departments]
      summary: Create a new IA department
      security: [{ adminSession: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/DepartmentInput"
      responses:
        "201":
          description: Created IA department
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Department"

  /ia-departments/{id}:
    patch:
      operationId: updateIaDepartment
      tags: [ia-departments]
      summary: Update an IA department
      security: [{ adminSession: [] }]
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/DepartmentUpdate"
      responses:
        "200":
          description: Updated IA department
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Department"
`;

code = code.replace(/  \/submissions:/, routes + '\n  /submissions:');
fs.writeFileSync('lib/api-spec/openapi.yaml', code);
