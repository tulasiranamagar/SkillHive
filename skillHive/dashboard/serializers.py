from rest_framework import serializers

class RoadmapPreviewSerializer(serializers.Serializer): 
    title=serializers.CharField(); 
    skill=serializers.CharField(allow_null=True,required=False); 
    completed=serializers.BooleanField()
    
class BadgeSerializer(serializers.Serializer): 
    name=serializers.CharField(); 
    description=serializers.CharField()
    
class XPHistorySerializer(serializers.Serializer): 
    points=serializers.IntegerField(); 
    reason=serializers.CharField(); 
    created_at=serializers.DateTimeField()
    
class DashboardInterestSerializer(serializers.Serializer): 
    id=serializers.IntegerField(); 
    name=serializers.CharField()
    
class DashboardContentRecommendationSerializer(serializers.Serializer): 
    id=serializers.IntegerField(); 
    title=serializers.CharField(); 
    description=serializers.CharField(); 
    content_type=serializers.CharField(); 
    unlock_type=serializers.CharField(); 
    price=serializers.CharField(); 
    xp_unlock_cost=serializers.IntegerField(); 
    creator=serializers.CharField(); 
    score=serializers.FloatField(); 
    matched_skills=serializers.ListField(child=serializers.CharField())
    
class DashboardExchangeRecommendationSerializer(serializers.Serializer): 
    id=serializers.IntegerField(); 
    title=serializers.CharField(); 
    description=serializers.CharField(); 
    user_id=serializers.IntegerField(); 
    username=serializers.CharField(); 
    offered_skill=serializers.CharField(); 
    requested_skill=serializers.CharField(); 
    score=serializers.FloatField(); 
    matched_skills=serializers.ListField(child=serializers.CharField())
    
class DashboardRecommendationsSerializer(serializers.Serializer): 
    interests=DashboardInterestSerializer(many=True); 
    known_skills=serializers.ListField(child=serializers.CharField()); 
    wanted_skills=serializers.ListField(child=serializers.CharField()); 
    active_goal=serializers.CharField(allow_null=True,required=False); 
    ai_recommended_skills=serializers.ListField(child=serializers.CharField()); 
    content=DashboardContentRecommendationSerializer(many=True); 
    exchange=DashboardExchangeRecommendationSerializer(many=True); 
    method=serializers.CharField()
    
class DashboardSerializer(serializers.Serializer): 
    username=serializers.CharField(); 
    xp=serializers.IntegerField(); 
    level=serializers.IntegerField(); 
    active_goal=serializers.CharField(allow_null=True,required=False); 
    progress=serializers.FloatField(); 
    total_tasks=serializers.IntegerField(); 
    completed_tasks=serializers.IntegerField(); 
    roadmap_preview=RoadmapPreviewSerializer(many=True); 
    badges=BadgeSerializer(many=True); 
    xp_history=XPHistorySerializer(many=True); 
    recommendations=DashboardRecommendationsSerializer()
