from typing import Optional
from typing import Any, Dict

from pydantic import BaseModel, ConfigDict, Field


class FeedbackSubmitRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    email: Optional[str] = ""
    message: str = Field(min_length=1, description="Feedback content")


class FeedbackSubmitResponse(BaseModel):
    success: bool
    message: str


class InferenceFeedbackRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    inference_id: str = Field(min_length=1)
    task: str = Field(min_length=1)
    model_name: str = Field(min_length=1)
    input_text: str = ""
    predicted_label: str = ""
    is_correct: bool
    correct_label: Optional[str] = None
    comment: Optional[str] = ""
    metadata: Dict[str, Any] = Field(default_factory=dict)


class InferenceFeedbackResponse(BaseModel):
    success: bool
    message: str
