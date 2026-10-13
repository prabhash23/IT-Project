from django.urls import path
from django.views.generic import TemplateView
from icu import views

urlpatterns = [
    # Frontend Pages
    path('', TemplateView.as_view(template_name='login.html'), name='home'),
    path('login/', TemplateView.as_view(template_name='login.html'), name='login'),
    path('ward/', TemplateView.as_view(template_name='ward.html'), name='ward'),
    path('orders/', TemplateView.as_view(template_name='orders.html'), name='orders'),
    path('blood-bank/', TemplateView.as_view(template_name='bloodbank.html'), name='bloodbank'),
    path('patient/<int:patient_id>/', TemplateView.as_view(template_name='patients.html'), name='patient'),

    # Backend API endpoints
    path('api/login/', views.login_view),
    path('api/bootstrap/', views.bootstrap),
    path('api/ward-patients/<int:ward_id>/', views.ward_patients),
    path('api/patient/<int:patient_id>/', views.patient_case),
    path('api/visits/', views.add_visit),                 # POST
    path('api/prescriptions/', views.add_prescription),   # POST
    path('api/test-orders/', views.add_test_order),       # POST
    path('api/test-results/', views.add_test_result),     # POST
    path('api/nursing-notes/', views.add_nursing_note),   # POST
    path('api/pharmacy-orders/', views.place_pharmacy_order),   # POST
    path('api/blood-orders/', views.place_blood_order),         # POST
    path('api/orders-queue/', views.orders_queue),
    path('api/orders/<str:kind>/<int:order_id>/', views.update_order_status),  # POST
    path('api/blood-stock/<int:stock_id>/', views.update_blood_stock),         # POST
    path('api/admit/', views.admit_patient),              # POST
    path('api/discharge/', views.discharge_patient),      # POST
    path('api/patient-condition/', views.update_patient_condition),  # POST
]