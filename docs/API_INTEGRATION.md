# API Integration Guide: Student Features & Admin Configuration

## Overview

The backend has been enhanced to support all new student features including video tutorials, quiz questions, mock interviews, and industrial standards. Super admins can now configure all content through dedicated API endpoints.

## Enhanced Data Model

### LearningPath Node Structure

```typescript
{
  id: string;
  type: 'topic' | 'root' | 'subtopic';
  data: {
    label: string;
    description?: string;
    estimatedTime?: number;

    // NEW: Video Tutorial Support
    videoUrl?: string;          // YouTube video ID or full URL
    isPremium?: boolean;         // Premium content flag

    // NEW: Quiz Engine Support
    questions?: [{
      id: string;
      text: string;
      options: string[];
      correctAnswer: number;
      explanation: string;
    }];

    // NEW: Mock Interview Support
    interviewQuestions?: [{
      question: string;
      difficulty: 'easy' | 'medium' | 'hard';
      expectedAnswer?: string;
    }];

    // NEW: Industrial Standards Checklist
    industrialStandards?: [{
      title: string;
      description: string;
      isCompleted?: boolean;
    }];

    // Existing fields...
    documentationLinks?: [...];
    codeSnippets?: [...];
    resources?: [...];
    keyPoints?: string[];
  };
  position: { x: number; y: number };
}
```

## Admin API Endpoints

### 1. Update Single Node Content

**Endpoint:** `PUT /api/admin/learning-paths/:pathId/nodes/:nodeId`

**Headers:**

```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "videoUrl": "dQw4w9WgXcQ",
  "isPremium": true,
  "questions": [
    {
      "id": "q1",
      "text": "What is the primary benefit of this concept?",
      "options": ["Speed", "Scalability", "Simplicity", "Security"],
      "correctAnswer": 1,
      "explanation": "This concept primarily improves scalability..."
    }
  ],
  "interviewQuestions": [
    {
      "question": "Explain how you would implement this in production",
      "difficulty": "hard",
      "expectedAnswer": "In production, I would..."
    }
  ],
  "industrialStandards": [
    {
      "title": "Production-ready implementation",
      "description": "Code must handle edge cases and errors gracefully"
    },
    {
      "title": "Unit test coverage",
      "description": "Minimum 80% code coverage required"
    }
  ]
}
```

**Response:**

```json
{
  "message": "Node content updated successfully",
  "node": {
    /* updated node object */
  }
}
```

### 2. Bulk Update Multiple Nodes

**Endpoint:** `PUT /api/admin/learning-paths/:pathId/nodes/bulk`

**Request Body:**

```json
{
  "nodes": [
    {
      "nodeId": "node-1",
      "updates": {
        "videoUrl": "abc123",
        "isPremium": false
      }
    },
    {
      "nodeId": "node-2",
      "updates": {
        "questions": [...],
        "industrialStandards": [...]
      }
    }
  ]
}
```

**Response:**

```json
{
  "message": "Nodes updated successfully",
  "path": {
    /* complete updated path object */
  }
}
```

## Usage Examples

### Example 1: Add Video Tutorial to a Node

```bash
curl -X PUT http://localhost:5000/api/admin/learning-paths/69641a1fb55b5351c3aba229/nodes/node-data-structures \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "dQw4w9WgXcQ",
    "isPremium": true
  }'
```

### Example 2: Add Quiz Questions

```bash
curl -X PUT http://localhost:5000/api/admin/learning-paths/69641a1fb55b5351c3aba229/nodes/node-arrays \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "questions": [
      {
        "id": "q1",
        "text": "What is the time complexity of array access?",
        "options": ["O(1)", "O(n)", "O(log n)", "O(n²)"],
        "correctAnswer": 0,
        "explanation": "Array access is O(1) because elements are stored contiguously in memory."
      }
    ]
  }'
```

### Example 3: Configure Industrial Standards

```bash
curl -X PUT http://localhost:5000/api/admin/learning-paths/69641a1fb55b5351c3aba229/nodes/node-algorithms \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "industrialStandards": [
      {
        "title": "Production-ready implementation",
        "description": "Handle all edge cases and error scenarios"
      },
      {
        "title": "Optimized resource consumption",
        "description": "Time and space complexity within acceptable bounds"
      },
      {
        "title": "Comprehensive error handling",
        "description": "Graceful degradation and meaningful error messages"
      },
      {
        "title": "Unit & Integration test coverage",
        "description": "Minimum 80% coverage with meaningful test cases"
      }
    ]
  }'
```

## Migration Notes

**No database migration required!** The enhanced schema is backward compatible. Existing learning paths will continue to work, and new fields will be `undefined` until populated by admins.

## Frontend Integration

The frontend components automatically consume these new fields:

- `VideoLesson.tsx` reads `node.data.videoUrl` and `node.data.isPremium`
- `QuizEngine.tsx` reads `node.data.questions`
- `InterviewPrep.tsx` reads `node.data.interviewQuestions`
- Briefing tab displays `node.data.industrialStandards`

## Security

All admin endpoints require:

1. Valid JWT authentication token
2. User role must be `'admin'` (enforced by `authMiddleware`)

**Recommendation:** Add a dedicated admin role check middleware for enhanced security.
