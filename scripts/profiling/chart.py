import pandas as pd
import plotly.graph_objects as go
import plotly.express as px

# Load data - TOP analysis
file_path = "<OUTPUT_FROM_TOP.JS>"
df = pd.read_csv(file_path, sep=';', encoding='utf-16', engine='python')

df['TimeStamp'] = pd.to_datetime(df['TimeStamp'])

# toggle on specific namespaces
default_namespaces = {
    # Add the namespaces you want to toggle on by default
}

# Create figure manually with one trace per namespace
fig = go.Figure()

for namespace in df['Namespace'].unique():
    namespace_df = df[df['Namespace'] == namespace]
    fig.add_trace(go.Scatter(
    x=namespace_df['TimeStamp'],
    y=namespace_df['Total Writes'],
    mode='lines+markers',
    name=namespace.split('.')[-1],  # Use short name in legend
    hovertemplate=(
        f"<b>Namespace:</b> {namespace}<br>" +
        "Time: %{x}<br>" +
        "Total Writes: %{y}<extra></extra>"  # <extra></extra> removes secondary box
    ),
    visible=True if namespace in default_namespaces else 'legendonly'
))

fig.update_layout(
    title=f"Total Ops per Namespace Over Time",
    xaxis_title="Timestamp",
    yaxis_title="Total Writes",
    legend_title="Namespace",
    hovermode='x unified'
)

fig.update_layout(
    updatemenus=[
        dict(
            type="buttons",
            direction="right",
            buttons=list([
                dict(
                    args=[{"showlegend": True}],
                    label="Show Legend",
                    method="relayout"
                ),
                dict(
                    args=[{"showlegend": False}],
                    label="Hide Legend",
                    method="relayout"
                )
            ]),
            pad={"r": 10, "t": 10},
            showactive=True,
            x=1.0,
            xanchor="right",
            y=1.15,
            yanchor="top"
        )
    ]
)

fig.show()
