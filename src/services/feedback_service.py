from typing import Any, Dict, List

from repositories.feedback_repository import FeedbackRepository


class FeedbackService:
    """Business logic for feedback workflows."""

    def __init__(self, repository: FeedbackRepository | None = None) -> None:
        self.repository = repository or FeedbackRepository()

    def submit_feedback(self, email: str, message: str) -> Dict[str, Any]:
        message = (message or "").strip()
        if not message:
            raise ValueError("Message is required")

        self.repository.create(email=(email or "").strip(), message=message)
        return {"success": True, "message": "Cảm ơn bạn đã gửi phản hồi!"}

    def list_feedback(self, limit: int = 50) -> List[Dict[str, Any]]:
        return self.repository.list(limit=limit)

    def submit_inference_feedback(
        self,
        inference_id: str,
        task: str,
        model_name: str,
        input_text: str,
        predicted_label: str,
        is_correct: bool,
        correct_label: str | None = None,
        comment: str | None = None,
        metadata: Dict[str, Any] | None = None,
    ) -> Dict[str, Any]:
        self.repository.create_inference_feedback(
            inference_id=inference_id,
            task=task,
            model_name=model_name,
            input_text=input_text,
            predicted_label=predicted_label,
            is_correct=is_correct,
            correct_label=correct_label,
            comment=comment,
            metadata=metadata or {},
        )
        return {"success": True, "message": "Đã ghi nhận phản hồi đúng/sai cho kết quả mô hình."}

    def list_inference_feedback(self, limit: int = 100) -> List[Dict[str, Any]]:
        return self.repository.list_inference_feedback(limit=limit)
