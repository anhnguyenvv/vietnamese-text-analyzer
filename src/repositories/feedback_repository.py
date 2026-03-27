from typing import Any, Dict, List

from database.db import load_feedback, load_inference_feedback, save_feedback, save_inference_feedback


class FeedbackRepository:
    """Persistence layer for feedback records."""

    def create(self, email: str, message: str) -> None:
        save_feedback(email, message)

    def list(self, limit: int = 50) -> List[Dict[str, Any]]:
        return load_feedback(limit=limit)

    def create_inference_feedback(
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
    ) -> None:
        save_inference_feedback(
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

    def list_inference_feedback(self, limit: int = 100) -> List[Dict[str, Any]]:
        return load_inference_feedback(limit=limit)
