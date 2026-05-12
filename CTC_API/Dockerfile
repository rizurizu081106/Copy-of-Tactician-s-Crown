FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY CTC_API/CTC_API.csproj CTC_API/
RUN dotnet restore "CTC_API/CTC_API.csproj"
COPY CTC_API/. CTC_API/
WORKDIR /src/CTC_API
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "CTC_API.dll"]
