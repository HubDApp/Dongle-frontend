"""
Type definitions for Dongle API Python SDK
"""

from typing import TypedDict, Optional, Literal, List, Any


class SubmissionData(TypedDict, total=False):
    projectName: str
    category: str
    description: str
    websiteUrl: Optional[str]
    githubUrl: Optional[str]
    logoUrl: Optional[str]
    docsUrl: Optional[str]


class ReviewData(TypedDict):
    projectId: str
    rating: int
    comment: str


class ApiResponse(TypedDict):
    success: bool
    data: Optional[Any]
    error: Optional[str]


class PaginationParams(TypedDict, total=False):
    limit: Optional[int]
    offset: Optional[int]
    page: Optional[int]


class FilterParams(TypedDict, total=False):
    status: Optional[str]
    category: Optional[str]
    sortBy: Optional[str]
    sortOrder: Optional[Literal['asc', 'desc']]
