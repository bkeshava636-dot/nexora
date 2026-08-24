const fs = require('fs');
const path = require('path');

const openapiPath = path.join(__dirname, '..', 'lib', 'api-spec', 'openapi.yaml');
let content = fs.readFileSync(openapiPath, 'utf8').replace(/\r\n/g, '\n');

// 1. Add tag
const tagTarget = '  - name: submissions\n    description: Student resource submissions';
const tagReplacement = '  - name: submissions\n    description: Student resource submissions\n  - name: feedback\n    description: User feedback and bug reports';
if (!content.includes(tagTarget)) {
  console.error('Tag target not found');
  process.exit(1);
}
content = content.replace(tagTarget, tagReplacement);

// 2. Add /feedback paths before components:
const pathsTarget = 'components:\n  securitySchemes:';
const feedbackPaths = `  /feedback:
    post:
      operationId: createFeedback
      tags: [feedback]
      summary: Submit user feedback or bug report
      description: Allows users to submit improvement suggestions, bug reports, content issues, or general feedback.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateFeedbackInput"
      responses:
        "201":
          description: Feedback submitted successfully
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Feedback"
        "400":
          description: Validation error
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"

    get:
      operationId: listFeedback
      tags: [feedback]
      summary: List user feedback
      description: Returns all feedback entries (Admin only).
      security: [{ adminSession: [] }]
      parameters:
        - name: status
          in: query
          description: Filter by status (pending, reviewed, archived, all)
          schema:
            type: string
        - name: category
          in: query
          description: Filter by category (improvement, bug, content, other)
          schema:
            type: string
      responses:
        "200":
          description: List of feedback
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/Feedback"

  /feedback/{id}:
    patch:
      operationId: updateFeedback
      tags: [feedback]
      summary: Update feedback status or admin notes
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
              $ref: "#/components/schemas/UpdateFeedbackInput"
      responses:
        "200":
          description: Updated feedback
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Feedback"

    delete:
      operationId: deleteFeedback
      tags: [feedback]
      summary: Delete feedback item
      security: [{ adminSession: [] }]
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        "200":
          description: Feedback deleted
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Feedback"

components:
  securitySchemes:`;

if (!content.includes(pathsTarget)) {
  console.error('Paths target not found');
  process.exit(1);
}
content = content.replace(pathsTarget, feedbackPaths);

// 3. Add Feedback Schemas to components.schemas
const schemasAddition = `
    FeedbackCategory:
      type: string
      enum:
        - improvement
        - bug
        - content
        - other

    FeedbackStatus:
      type: string
      enum:
        - pending
        - reviewed
        - archived

    Feedback:
      type: object
      properties:
        id:
          type: integer
        category:
          $ref: "#/components/schemas/FeedbackCategory"
        message:
          type: string
        name:
          type: string
          nullable: true
        email:
          type: string
          nullable: true
        pageUrl:
          type: string
          nullable: true
        status:
          $ref: "#/components/schemas/FeedbackStatus"
        adminNotes:
          type: string
          nullable: true
        createdAt:
          type: string
          format: date-time
      required:
        - id
        - category
        - message
        - status
        - createdAt

    CreateFeedbackInput:
      type: object
      properties:
        category:
          $ref: "#/components/schemas/FeedbackCategory"
        message:
          type: string
        name:
          type: string
        email:
          type: string
        pageUrl:
          type: string
      required:
        - message

    UpdateFeedbackInput:
      type: object
      properties:
        status:
          $ref: "#/components/schemas/FeedbackStatus"
        adminNotes:
          type: string
`;

content = content.trimEnd() + '\n' + schemasAddition;

fs.writeFileSync(openapiPath, content, 'utf8');
console.log('Successfully updated openapi.yaml');
